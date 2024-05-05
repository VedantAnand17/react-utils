/* global document */

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import ReactDom from 'react-dom';
import PT from 'prop-types';
import themed, { type Theme } from '@dr.pogodin/react-themes';

import baseTheme from './base-theme.scss';
import S from './styles.scss';

const validThemeKeys = ['container', 'overlay'] as const;

type PropsT = {
  cancelOnScrolling?: boolean;
  children?: ReactNode;
  containerStyle?: React.CSSProperties;
  dontDisableScrolling?: boolean;
  onCancel?: () => void;
  theme: Theme<typeof validThemeKeys>;
};

/**
 * The `<Modal>` component implements a simple themeable modal window, wrapped
 * into the default theme. `<BaseModal>` exposes the base non-themed component.
 * **Children:** Component children are rendered as the modal content.
 * @param {object} props Component properties. Beside props documented below,
 *  [Other theming properties](https://www.npmjs.com/package/@dr.pogodin/react-themes#themed-component-properties) are supported as well.
 * @param {function} [props.onCancel] The callback to trigger when user
 * clicks outside the modal, or presses Escape. It is expected to hide the
 * modal.
 * @param {ModalTheme} [props.theme] _Ad hoc_ theme.
 */
const BaseModal: React.FunctionComponent<PropsT> = ({
  cancelOnScrolling,
  children,
  containerStyle,
  dontDisableScrolling,
  onCancel,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [portal, setPortal] = useState<HTMLDivElement>();

  useEffect(() => {
    const p = document.createElement('div');
    document.body.appendChild(p);
    setPortal(p);
    return () => {
      document.body.removeChild(p);
    };
  }, []);

  // Sets up modal cancellation of scrolling, if opted-in.
  useEffect(() => {
    if (cancelOnScrolling && onCancel) {
      window.addEventListener('scroll', onCancel);
      window.addEventListener('wheel', onCancel);
    }
    return () => {
      if (cancelOnScrolling && onCancel) {
        window.removeEventListener('scroll', onCancel);
        window.removeEventListener('wheel', onCancel);
      }
    };
  }, [cancelOnScrolling, onCancel]);

  // Disables window scrolling, if it is not opted-out.
  useEffect(() => {
    if (!dontDisableScrolling) {
      document.body.classList.add(S.scrollingDisabledByModal);
    }
    return () => {
      if (!dontDisableScrolling) {
        document.body.classList.remove(S.scrollingDisabledByModal);
      }
    };
  }, [dontDisableScrolling]);

  const focusLast = useMemo(() => (
    <div
      onFocus={() => {
        const elems = containerRef.current?.querySelectorAll('*') as NodeListOf<HTMLElement>;
        for (let i = elems.length - 1; i >= 0; --i) {
          elems[i].focus();
          if (document.activeElement === elems[i]) return;
        }
        overlayRef.current?.focus();
      }}
      /* eslint-disable jsx-a11y/no-noninteractive-tabindex */
      tabIndex={0}
      /* eslint-enable jsx-a11y/no-noninteractive-tabindex */
    />
  ), []);

  return portal ? ReactDom.createPortal(
    (
      <>
        {focusLast}
        <div
          aria-label="Cancel"
          className={theme.overlay}
          onClick={(e) => {
            if (onCancel) {
              onCancel();
              e.stopPropagation();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && onCancel) {
              onCancel();
              e.stopPropagation();
            }
          }}
          ref={(node) => {
            if (node && node !== overlayRef.current) {
              overlayRef.current = node;
              node.focus();
            }
          }}
          role="button"
          tabIndex={0}
        />
        {
          // NOTE: These rules are disabled because our intention is to keep
          // the element non-interactive (thus not on the keyboard focus chain),
          // and it has `onClick` handler merely to stop propagation of click
          // events to its parent container. This is needed because, for example
          // when the modal is wrapped into an interactive element we don't want
          // any clicks inside the modal to bubble-up to that parent element
          // (because visually and logically the modal dialog does not belong
          // to its parent container, where it technically belongs from
          // the HTML mark-up perpective).
          /* eslint-disable jsx-a11y/click-events-have-key-events,
             jsx-a11y/no-noninteractive-element-interactions */
        }
        <div
          aria-modal="true"
          className={theme.container}
          onClick={(e) => e.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          ref={containerRef}
          role="dialog"
          style={containerStyle}
        >
          {children}
        </div>
        {/* eslint-enable jsx-a11y/click-events-have-key-events,
            jsx-a11y/no-noninteractive-element-interactions */}
        <div
          onFocus={() => {
            overlayRef.current?.focus();
          }}
          /* eslint-disable jsx-a11y/no-noninteractive-tabindex */
          tabIndex={0}
          /* eslint-enable jsx-a11y/no-noninteractive-tabindex */
        />
        {focusLast}
      </>
    ),
    portal,
  ) : null;
};

const ThemedModal = themed(
  BaseModal,
  'Modal',
  validThemeKeys,
  baseTheme,
);

BaseModal.propTypes = {
  cancelOnScrolling: PT.bool,
  children: PT.node,
  containerStyle: PT.shape({}),
  dontDisableScrolling: PT.bool,
  onCancel: PT.func,
  theme: ThemedModal.themeType.isRequired,
};

export default ThemedModal;

/* Non-themed version of the Modal. */
export { BaseModal };
