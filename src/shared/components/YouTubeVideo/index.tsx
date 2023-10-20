import PT from 'prop-types';
import qs from 'qs';
import { type FunctionComponent } from 'react';

import { type ThemeT, themedComponent } from '@dr.pogodin/react-themes';

import ScalableRect from 'components/ScalableRect';
import Throbber from 'components/Throbber';

import baseTheme from './base.scss';
import throbberTheme from './throbber.scss';

type ComponentThemeT = ThemeT & {
  container?: string;
  video?: string;
};

type PropsT = {
  autoplay?: boolean;
  src: string;
  theme: ComponentThemeT,
  title?: string;
};

/**
 * A component for embeding a YouTube video.
 * @param [props] Component properties.
 * @param [props.autoplay] If `true` the video will start to play
 * automatically once loaded.
 * @param [props.src] URL of the video to play. Can be in any of
 * the following formats, and keeps any additional query parameters understood
 * by the YouTube IFrame player:
 * - `https://www.youtube.com/watch?v=NdF6Rmt6Ado`
 * - `https://youtu.be/NdF6Rmt6Ado`
 * - `https://www.youtube.com/embed/NdF6Rmt6Ado`
 * @param [props.theme] _Ad hoc_ theme.
 * @param [props.title] The `title` attribute to add to the player
 * IFrame.
 */
function YouTubeVideo({
  autoplay,
  src,
  theme,
  title,
}: PropsT) {
  const srcParts = src.split('?');
  let url = srcParts[0];
  const queryString = srcParts[1];
  const query = queryString ? qs.parse(queryString) : {};

  const videoId = query.v || url.match(/\/([a-zA-Z0-9-_]*)$/)?.[1];
  url = `https://www.youtube.com/embed/${videoId}`;

  delete query.v;
  query.autoplay = autoplay ? '1' : '0';
  url += `?${qs.stringify(query)}`;

  // TODO: https://developers.google.com/youtube/player_parameters
  // More query parameters can be exposed via the component props.

  return (
    <ScalableRect className={theme.container} ratio="16:9">
      <Throbber theme={throbberTheme} />
      <iframe
        allow="autoplay"
        allowFullScreen
        className={theme.video}
        src={url}
        title={title}
      />
    </ScalableRect>
  );
}

const ThemedYouTubeVideo = themedComponent(
  'YouTubeVideo',
  YouTubeVideo,
  [
    'container',
    'video',
  ],
  baseTheme,
);

(YouTubeVideo as FunctionComponent<PropsT>).propTypes = {
  autoplay: PT.bool,
  src: PT.string.isRequired,
  theme: ThemedYouTubeVideo.themeType.isRequired,
  title: PT.string,
};

YouTubeVideo.defaultProps = {
  autoplay: false,
  title: '',
};

export default ThemedYouTubeVideo;
