const request = require('request');
const fs = require('fs');
const cheerio = require('cheerio');

module.exports = (id) => {
    const url = 'https://syllabus.sfc.keio.ac.jp/courses/' + id;

    request(url, (errorJp, responseJp, bodyJp) => {
        request(url + '?locale=en', (errorEn, responseEn, bodyEn) => {
            if (errorEn || errorJp) {
                console.error(`Error loading data for ${url}`);
                console.error(errorEn);
                console.error(errorJp);
                return;
            }

            const fileName = `data/${id}.json`;
            fs.writeFile(fileName, JSON.stringify(buildObject(bodyJp, bodyEn)), () => {
                console.log(`Done writing ${fileName}`);
            });
        });
    });
}

function buildObject(bodyJp, bodyEn) {
    const dom = cheerio.load(bodyJp);
    const domEn = cheerio.load(bodyEn);
    return {
        "category" : {
            "en" : getDD('Field (Undergraduate) ', domEn),
            "jp" : getDD('分野', dom),
            "kana" : null
        },
        "language" : {
            "en" : getDD('Language', domEn),
            "jp" : getDD('言語', dom),
            "kana" : null
        },
        "lecturers" : getLecturers(dom, domEn),
        "title" : {
            "postscript" : {
                "en" : null,
                "jp" : null,
                "kana" : null
            },
            "name": dom('h2 .title').text() + '/' + domEn('h2 .title').text()
        },
        "schedule": getSchedule(dom, domEn),
        "related" : null,
        "registration" : {
            "number" : null,
            "suggestion" : {
                "en" : "",
                "jp" : "",
                "kana" : null
            },
            "requirement" : {
                "en" : "",
                "jp" : "",
                "kana" : null
            },
            "prerequisite" : null
        },
        "classroom" : getDD('開講場所', dom),
        "summary" : {
            "en" : getDD('Course Summary', domEn),
            "jp" : getDD('講義概要', dom),
            "kana" : null
        },
        "types" : null,
        "yearClassId" : null,
        "tag" : {
            "giga" : getDD('GIGAサティフィケート対象', dom) === '対象'
        },
        "curriculumCode" : getDD('科目ソート', dom),
        "credit" : parseInt(getDD('単位', dom))
    };
}

function getDD(label, dom) {
    return dom('dt').filter((index, elem) => dom(elem).text().includes(label)).first().next('dd').text().trim();
}

function getLecturers(dom, domEn) {
    const lecturers = [];

    const namesEn = getDD('Lecturer Name', domEn).split(',');
    const namesJp = getDD('授業教員名', dom).split(',');

    for (let i = 0; i < namesJp.length; i++) {
        lecturers.push({
            "imgUrl" : null,
            "name" : {
                "en" : namesEn[i],
                "jp" : namesJp[i],
                "kana" : ''
            },
            "id" : null,
            "email" : "",
            "inCharge" : true
        });
    }

    return lecturers;
}

function getSchedule(dom, domEn) {
    const titleJp = dom('h2 .title').text();
    const half = titleJp.includes('学期前半') ? '前半' : (titleJp.includes('学期後半') ? '後半' : null);
    return {
        "year" : parseInt(getDD('開講年度・学期', dom)),
        "span" : {
            "en" : half === '前半' ? 'First half' : (half === '後半' ? 'Second half' : null),
            "jp" : half,
            "kana" : null
        },
        "semester" : {
            "en" : getDD('開講年度・学期', dom).split(' ')[1],
            "jp" : getDD('開講年度・学期', dom).split(' ')[1] === '春学期' ? 'Spring' : 'Fall',
            "kana" : null
        },
        "times" : {
            "en" : getDD('Day of Week・Period', domEn),
            "jp" : getDD('曜日・時限', dom),
            "kana" : null
        }
    };
}
