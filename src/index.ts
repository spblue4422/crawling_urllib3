import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

getHtmls();

async function getHtmls() {
  try {
    let urlArr: string[] = [];
    let apiNameArr: string[][] = [];

    const baseHtml: AxiosResponse = await axios.get(
      "https://urllib3.readthedocs.io/en/stable/reference/index.html"
    );

    const $ = cheerio.load(baseHtml.data);

    $("li.toctree-l1").each((i, e) => {
      urlArr.push($(e).find("a").first().attr("href"));
    });

    urlArr = urlArr
      .slice(9, 17)
      .map(
        (url) => "https://urllib3.readthedocs.io/en/stable/reference/" + url
      );

    urlArr.forEach(async (url, idx) => {
      const html: AxiosResponse = await axios.get(url);
      const $ = cheerio.load(html.data);
      let tmpArr: string[] = [];

      $("span.descname").each((i, el) => {
        tmpArr.push($(el).text());
      });

      console.log(tmpArr);
      apiNameArr.push(tmpArr);
    });

    // console.log(apiNameArr);
  } catch (error) {
    console.log(error);
  }
}
