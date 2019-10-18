/**
 * The standard Avatar component.
 * To use it you will have to properly wrap it with React Themes,
 * the component provided here takes care about the code interface and logic
 * only.
 */

import PT from 'prop-types';
import React from 'react';

export default function Avatar({ DefaultAvatar, theme, url }) {
  return url
    ? <img alt="Avatar" src={url} className={theme.avatar} />
    : <DefaultAvatar className={theme.avatar} />;
}

Avatar.defaultProps = {
  url: null,
};

Avatar.propTypes = {
  DefaultAvatar: PT.func.isRequired,
  theme: PT.shape({
    avatar: PT.string.isRequired,
  }).isRequired,
  url: PT.string,
};
