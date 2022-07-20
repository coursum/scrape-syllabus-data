import {
  access, mkdir, readdir, rm,
} from 'fs/promises';

const createDirectoryIfNotExist = async (dirpath: string) => {
  try {
    await access(dirpath);
  } catch {
    await mkdir(dirpath, { recursive: true });
    console.log(`${dirpath} is created`);
  }
};

const removeDirectoryIfExist = async (dirpath: string) => {
  try {
    await access(dirpath);
    await rm(dirpath, { recursive: true });
  } catch {
    //
  }
};

const listFiles = async (dirpath: string) => {
  const files = await readdir(dirpath, { withFileTypes: true });

  return files.flatMap((file) => (file.isFile() ? file.name : []));
};

export {
  createDirectoryIfNotExist,
  removeDirectoryIfExist,
  listFiles,
};
