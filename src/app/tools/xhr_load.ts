/**
 * A mediocre XML loading function. Should really be replaced by some library
 * that does a better job.
 */
export function xhrLoad(url: string): Promise<XMLDocument> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        reject(xhr.statusText);
      }
    };
    xhr.onerror = () => {
      // TODO: Not sure this will be helpful.
      reject(xhr.statusText);
    };

    xhr.open('GET', url);
    xhr.responseType = 'document';
    xhr.send();
  });
}
