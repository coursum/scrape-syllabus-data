const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const getCourseData = require('./getCourse');

const initialPath = '/courses?locale=ja&search%5Btitle%5D=&search%5Byear%5D=2021&search%5Bsemester%5D=&search%5Bsub_semester%5D=&search%5Bteacher_name%5D=&search%5Bsummary%5D=&button=';

let count = 1;
let errors = 0;
let files = 0;

function scanPage(path) {
    const url = 'https://syllabus.sfc.keio.ac.jp' + path;
    request(url, (error, response, body) => {
        if (error) {
            console.error(`Error loading data for ${url}`);
            console.error(error);
            return;
        }
        const dom = cheerio.load(body);
        const nextLink = dom('.next a').attr('href');
        console.log(`Page ${count}: ${dom('.detail-btn').length} courses have a link`);
        dom('.detail-btn').each((index, elem) => {
            const courseId = dom(elem).attr('href').replace('/courses/', '')
                .split('?')[0];
            console.log(courseId);
            if (!fs.existsSync(`data/${courseId}.json`)) {
                getCourseData(courseId, () => {
                    console.log(`Done writing ${courseId}`);
                    files++;
                },
                (errorJp, errorEn) => {
                    console.error(`Error loading data for ${courseId}`);
                    // console.error(errorEn);
                    // console.error(errorJp);
                    errors++;
                });
            } else {
                console.log(`Skipping ${courseId} - already loaded`);
            }
        });
        if (nextLink) {
            count++;
            scanPage(nextLink);
        } else if (errors > 0) {
            console.log(`${errors} errors - trying again!`);
            errors = 0;
            scanPage(initialPath);
        } else {
            console.log(`Done - got ${files} courses`);
        }
    });
}

scanPage(initialPath);
