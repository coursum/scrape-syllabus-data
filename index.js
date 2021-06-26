const fs = require('fs');

const getCourses = require('./getCourses');

const dataFolder = './data';

(async () => {
  if (!fs.existsSync(dataFolder)) {
    await fs.promises.mkdir(dataFolder);
  }

  const { fulfilled: courses, rejected: errors } = await getCourses();

  await fs.promises.writeFile('all.json', JSON.stringify(Object.fromEntries(courses)));

  if (errors.length > 0) {
    console.log(`${errors.length} errors`);
    errors.forEach((error) => console.error(error));
  }

  if (courses.length > 0) {
    console.log(`Done - got ${courses.length} courses`);
    courses.forEach(([courseId, course]) => {
      const fileName = `data/${courseId}.json`;

      fs.writeFile(fileName, JSON.stringify(course), () => {
        console.log(`Done writing ${courseId}`);
      });
    });
  }
})();
