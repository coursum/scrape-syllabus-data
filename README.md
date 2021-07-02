This project is for scraping course data from https://syllabus.sfc.keio.ac.jp

## Installation

You'll need Nodejs with yarn - run `yarn`

## Running

First, build this project with `yarn build`.
After that, you can use `yarn scrape` to fetch & extract courses.
All of the data will be saved into a folder `data/` by defualt.

## Command Help
```
$ scrape fetch page [options] [<page-number>...]
$ scrape extract ids [options] [<page-number>...]
$ scrape fetch course [options] [<course-id>...]
$ scrape extract course [options] [<course-id>...]
```
