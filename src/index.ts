import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

getHtmls();

async function getHtmls() {
  try {
    let urlArr: string[] = [
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

    urlArr.forEach(async (url, idx) => {
      const subHtml: AxiosResponse = await axios.get(url);
      const subData = cheerio.load(subHtml.data);
      let tmpArr: string[] = [];

      subData(".py.method").each((i, el) => {
        tmpArr.push(cheerio.load(el)("dt").first().attr("id"));
      });

      subData(".py.function").each((i, el) => {
        tmpArr.push(cheerio.load(el)("dt").first().attr("id"));
      });

      console.log(tmpArr);

      // url이랑 뽑아낸 배열로 gpt api로 질문하는 부분
    });
  } catch (error) {
    console.log(error);
  }
}
