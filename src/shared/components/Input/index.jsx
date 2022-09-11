import PT from 'prop-types';
import { forwardRef } from 'react';

import { themed } from 'utils';

import defaultTheme from './theme.scss';

/**
 * Themeable input field, based on the standard HTML `<input>` element.
 * @param {object} [props]
 * @param {string} [props.label] Input label.
 * @param {InputTheme} [props.theme] _Ad hoc_ theme.
 * @param {...any} [props...] [Other theming properties](https://www.npmjs.com/package/@dr.pogodin/react-themes#themed-component-properties)
 * @param {...any} [props...] Any other properties are passed to the underlying
 * `<input>` element.
 */
const Input = forwardRef(({
  label,
  theme,
  ...rest
}, ref) => (
  <span className={theme.container}>
    { label === undefined ? null : <p className={theme.label}>{label}</p> }
    <input
      className={theme.input}
      ref={ref}
      {...rest} // eslint-disable-line react/jsx-props-no-spreading
    />
  </span>
));

const ThemedInput = themed('Input', [
  'container',
  'input',
  'label',
], defaultTheme)(Input);

Input.propTypes = {
  label: PT.string,
  theme: ThemedInput.themeType.isRequired,
};

Input.defaultProps = {
  label: undefined,
};

export default ThemedInput;
