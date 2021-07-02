interface SettledResult<T> {
  status: PromiseSettledResult<T>['status'];
  value?: T;
  reason?: any;
}

interface AggregatedSettledPromises<T> {
  fulfilled: T[];
  rejected: any[];
}

const allSettled = async <T>(promises: Promise<T>[]) => {
  const promiseSettledResult = await Promise.allSettled(promises);
  const aggregatedResult: AggregatedSettledPromises<T> = { fulfilled: [], rejected: [] };

  return promiseSettledResult.reduce(
    (result, { status, value, reason }: SettledResult<T>) => {
      result[status].push(value ?? reason);

      return result;
    },
    aggregatedResult,
  );
};

const printErrors = (errors: any[], errorType = 'error', { debug } = { debug: false }) => {
  const flattenErrors = errors.flat(Infinity);
  const errorCount = flattenErrors.length;

  if (errorCount > 0) {
    console.log(`${errorCount} ${errorType}s`);

    if (debug) {
      errors.forEach((error) => console.error(error));
    }
  }
};

export {
  allSettled,
  printErrors,
};
