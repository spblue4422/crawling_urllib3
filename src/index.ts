import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import xlsx from "xlsx";

dotenv.config();
getHtmls();

class fucntionDataUnit {
  name: string;
  html: string;
}

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
    //   subUrlArr.push($(e).find("a").first().attr("href"));
    // });

    // subUrlArr = subUrlArr
    //   .slice(9, 17)
    //   .map(
    //     (url) => "https://urllib3.readthedocs.io/en/stable/reference/" + url
    //   );

    await Promise.all(
      subUrlArr.map(async (url, idx) => {
        const subHtml: AxiosResponse = await axios.get(url);
        const subData = cheerio.load(subHtml.data);
        let functionNameAndHtmlArr: Array<fucntionDataUnit> = [];

        subData(".py.method").each((i, el) => {
          let tmp = cheerio.load(el);
          functionNameAndHtmlArr.push({
            name: tmp("dt").first().attr("id"),
            html: tmp.html(),
          });
        });

        subData(".py.function").each((i, el) => {
          let tmp = cheerio.load(el);
          functionNameAndHtmlArr.push({
            name: tmp("dt").first().attr("id"),
            html: tmp.html(),
          });
        });

        await Promise.all(
          functionNameAndHtmlArr.map(async ({ name, html }) => {
            const response = await gpt.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: makeQuery(name, html),
            });
            const json = {
              name,
              data: response.choices[0].message.content,
              url: url + "#" + name,
              token: response.usage.total_tokens,
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

function makeQuery(
  name: string,
  html: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {
      role: "user",
      content: `Read below document, provide structured data to me, about the function '${name}' in English. ${html}`,
    },
    {
      role: "user",
      content:
        "Structured data must include parameter information(names, types, default values(required or optional), and descriptions) and return information(type, description).",
    },
    {
      role: "user",
      content:
        "And also include precautions for API usage, written code-like expressions. For example, 'parameter_1 > 0', len(parameter_2) > 0.",
    },
    {
      role: "user",
      content:
        "If the function is deprecated, please add the 'DEPRECATED' to the precautions.",
    },

    {
      role: "user",
      content:
        "If there is no more parameters, leave it blank. Don't give me false information.",
    },
    {
      role: "user",
      content: `
        Structure should be as belows.
        {
          "function name": "~",
          "parameters": {
            "parameter_1": {
              "type": "integer"
              "default": "Required"
              "description": "~"
            },
            "parameter_2": {
              "type": "List<integer>"
              "default": "Required"
              "description": "~"
            },
            "parameter_3": {
              "type": "integer",
              "default": "10 (Optional)",
              "description": "~"
            },
            "parameter_4": {
              "type": "integer",
              "default": "None (Optional)",
              "description": "~"
            },
            ...
          },
          "return_value": {
            "type": "string",
            "description": "~"
          },
          "precautions for API usage": [
            "parameter_1 > 0",
            "len(parameter_2) > 0",
            ...
          ]
        }`,
    },
    {
      role: "user",
      content:
        "You don't have to explain the function additionally, just give me structured data.",
    },
  ];
}
