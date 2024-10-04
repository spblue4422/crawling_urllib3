import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import xlsx from "xlsx";

dotenv.config();
getHtmls();

async function getHtmls() {
  try {
    const excel = xlsx.utils.book_new();
    let jsonArr: Object[] = [];

    const gpt = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let subUrlArr: string[] = [
      "https://urllib3.readthedocs.io/en/stable/reference/urllib3.poolmanager.html",
      "https://urllib3.readthedocs.io/en/stable/reference/urllib3.response.html",
      "https://urllib3.readthedocs.io/en/stable/reference/urllib3.fields.html",
      "https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html",
    ];

    // const baseHtml: AxiosResponse = await axios.get(
    //   "https://urllib3.readthedocs.io/en/stable/reference/index.html"
    // );

    // const $ = cheerio.load(baseHtml.data);

    // $("li.toctree-l1").each((i, e) => {
    //   urlArr.push($(e).find("a").first().attr("href"));
    // });

    // urlArr = urlArr
    //   .slice(9, 17)
    //   .map(
    //     (url) => "https://urllib3.readthedocs.io/en/stable/reference/" + url
    //   );

    await Promise.all(
      subUrlArr.map(async (url, idx) => {
        const subHtml: AxiosResponse = await axios.get(url);
        const subData = cheerio.load(subHtml.data);
        let tmpArr: string[] = [];

        subData(".py.method").each((i, el) => {
          tmpArr.push(cheerio.load(el)("dt").first().attr("id"));
        });

        subData(".py.function").each((i, el) => {
          tmpArr.push(cheerio.load(el)("dt").first().attr("id"));
        });

        await Promise.all(
          tmpArr.map(async (name) => {
            const response = await gpt.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: makeQuery(url, name) }],
            });
            const json = {
              name,
              data: response.choices[0].message.content,
              url: url + "#" + name,
            };

            jsonArr.push(json);
          })
        );
      })
    );

    const ws = xlsx.utils.json_to_sheet(jsonArr);
    xlsx.utils.book_append_sheet(excel, ws);

    xlsx.writeFile(excel, "data.xlsx");
  } catch (error) {
    console.log(error);
  }
}

function makeQuery(url: string, method: string): string {
  const query: string = `${url}]에서 '${method}'에 대해 인자의 종류/타입/기본값/필수 여부(required | optional), 반환 타입, api 사용 시 주의 사항('must','must not')을 structured data로 한글을 사용해서 정리해줘.
    범위가 언급되는 경우에는 부등호로 표기해줘. structured data의 형식은 아래의 json 형태로 정리해줘.

    {
      "함수명": "~", 
      "파라미터": {
        "첫 번째 인자": { 
          "타입": "~", 
          "기본값": "필수",
          "설명": "~" 
        },
        "두 번째 인자": { 
          "타입": "~", 
          "기본값": "None",
          "설명": "~" 
        },
        ... 
      },
      "반환값": {
        "타입": "~", 
        "설명": "~" 
      },
      "사용 시 주의점": [
        "1. ~", 
        "2. ~" 
      ]
    }`;

  return query;
}
