import fs from 'fs';

import getCourses from './getCourses';

const dataFolder = './data';

const createDirectoryIfNotExist = async (path: string) => {
  if (!fs.existsSync(path)) {
    await fs.promises.mkdir(dataFolder);
  }
};

(async () => {
  await createDirectoryIfNotExist(dataFolder);

  const { fulfilled: courses, rejected: errors } = await getCourses();

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
