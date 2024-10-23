import { css } from 'lit';

/** current version of the card. */
export const CARD_VERSION = '1.0.3';

/** SpotifyPlus integration domain identifier. */
export const DOMAIN_SPOTIFYPLUS = 'spotifyplus';

/** media_player integration domain identifier. */
export const DOMAIN_MEDIA_PLAYER = 'media_player';

/** debug application name. */
export const DEBUG_APP_NAME = 'spotifyplus-card';

/** prefix used for event dispatching to make them unique throughtout the system. */
const dispatchPrefix = 'spc-dispatch-event-';

/** uniquely identifies the configuration updated event. */
export const CONFIG_UPDATED = dispatchPrefix + 'config-updated';

/** identifies the media browser refresh event. */
export const MEDIA_BROWSER_REFRESH = 'media-browser-refresh';

/** identifies the item selected event. */
export const ITEM_SELECTED = 'item-selected';

/** identifies the item selected event. */
export const ITEM_SELECTED_WITH_HOLD = 'item-selected-with-hold';

/** identifies the show section event. */
export const SHOW_SECTION = 'show-section';

/** Company branding logo image to display on the card picker */
export const BRAND_LOGO_IMAGE_BASE64 =
  'data:image/png;base64,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';

/** Company branding logo image size to display on the card picker */
export const BRAND_LOGO_IMAGE_SIZE = '30%';

export const listStyle = css`
  .list {
    --mdc-theme-primary: var(--accent-color);
    --mdc-list-vertical-padding: 0px;
    overflow: hidden;
  }
`;
