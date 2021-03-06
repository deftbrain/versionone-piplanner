import {API_ENTRYPOINT} from '../config/app';
import {SubmissionError} from 'redux-form';
import get from 'lodash/get';
import has from 'lodash/has';
import mapValues from 'lodash/mapValues';
import {finishUserSession} from '../authProvider';

const MIME_TYPE = 'application/ld+json';

export function fetch(id, options = {}, searchParams) {
  options.credentials = 'include';
  if ('undefined' === typeof options.headers)
    options.headers = new Headers();

  if (null === options.headers.get('Accept'))
    options.headers.set('Accept', MIME_TYPE);

  if (
    'undefined' !== options.body &&
    !(options.body instanceof FormData) &&
    null === options.headers.get('Content-Type')
  )
    options.headers.set('Content-Type', MIME_TYPE);

  if (searchParams) {
    const params = new URLSearchParams();
    for (let param in searchParams) {
      if (Array.isArray(searchParams[param])) {
        let paramArray = `${param}[]`;
        for (let value of searchParams[param]) {
          params.append(paramArray, value);
        }
      } else {
        params.append(param, searchParams[param]);
      }
    }
    id += '?' + params.toString();
  }
  const url = new URL(id, API_ENTRYPOINT);

  return global.fetch(url, options)
    .then(response => {
      if (response.ok) {
        return response;
      }

      if ([401, 403].indexOf(response.status) !== -1) {
        finishUserSession();
        window.location.reload();
      }

      return response.json()
        .then(json => {
          const error =
            json['hydra:description'] ||
            json['hydra:title'] ||
            'An error occurred.';
          if (!json.violations) throw Error(error);

          let errors = {_error: error};
          json.violations.forEach(violation =>
            errors[violation.propertyPath]
              ? (errors[violation.propertyPath] +=
              '\n' + errors[violation.propertyPath])
              : (errors[violation.propertyPath] = violation.message)
          );

          console.log(errors);
          throw new SubmissionError(errors);
        })
        .catch(error => Promise.reject(new Error(error.message || 'An error occurred.')));
    });
}

export function mercureSubscribe(url, topics) {
  topics.forEach(topic =>
    // Add decoding to allow using patterns (e.g. /workitems/{id}) as a topic
    url.searchParams.append('topic', decodeURIComponent(new URL(topic, API_ENTRYPOINT)))
  );

  return new EventSource(url.toString(), {
    withCredentials: true
  });
}

export function normalize(data) {
  if (has(data, 'hydra:member')) {
    // Normalize items in collections
    data['hydra:member'] = data['hydra:member'].map(item => normalize(item));

    return data;
  }

  // Flatten nested documents
  return mapValues(data, value =>
    Array.isArray(value)
      ? value.map(v => get(v, '@id', v))
      : get(value, '@id', value)
  );
}

export function extractHubURL(response) {
  const linkHeader = response.headers.get('Link');
  if (!linkHeader) return null;

  const matches = linkHeader.match(
    /<([^>]+)>;\s+rel=(?:mercure|"[^"]*mercure[^"]*")/
  );

  return matches && matches[1] ? new URL(matches[1], API_ENTRYPOINT) : null;
}
