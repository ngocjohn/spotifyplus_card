// lovelace card imports.
import { css, html, TemplateResult } from 'lit';

// our imports.
import { BaseEditor } from './base-editor';
import { Section } from '../types/section';
import { EDITOR_DEFAULT_BROWSER_ITEMS_PER_ROW } from '../constants';


const CONFIG_SETTINGS_SCHEMA = [
  {
    name: 'searchMediaBrowserTitle',
    label: 'Section title text',
    help: 'displayed at the top of the section',
    required: false,
    type: 'string',
  },
  {
    name: 'searchMediaBrowserSubTitle',
    label: 'Section sub-title text',
    help: 'displayed below the section title',
    required: false,
    type: 'string',
  },
  {
    name: 'searchMediaBrowserSearchTypes',
    label: 'Search media types to enable',
    help: 'unchecked items will not be shown; all enabled if none checked',
    required: false,
    type: 'multi_select',
    options: {
      /* the following must match defined names in `search-media-types.ts` */
      Albums: 'Albums',          /* SearchMediaTypes.ALBUMS */
      Artists: 'Artists',        /* SearchMediaTypes.ARTISTS */
      AudioBooks: 'AudioBooks',  /* SearchMediaTypes.AUDIOBOOKS */
      Episodes: 'Episodes',      /* SearchMediaTypes.EPISODES */
      Playlists: 'Playlists',    /* SearchMediaTypes.PLAYLISTS */
      Shows: 'Shows',            /* SearchMediaTypes.SHOWS */
      Tracks: 'Tracks',          /* SearchMediaTypes.TRACKS */
    },
  },
  {
    name: 'searchMediaBrowserSearchLimit',
    label: 'Maximum # of items to return by the search',
    required: false,
    type: 'integer',
    default: 50,
    valueMin: 25,
    valueMax: 500,
  },
  {
    name: 'searchMediaBrowserUseDisplaySettings',
    label: 'Use search display settings when displaying results:',
    required: false,
    selector: { boolean: {} },
  },
  {
    name: 'searchMediaBrowserItemsPerRow',
    label: '# of items to display per row',
    help: 'use 1 for list format',
    required: true,
    type: 'integer',
    default: EDITOR_DEFAULT_BROWSER_ITEMS_PER_ROW,
    valueMin: 1,
    valueMax: 12,
  },
  {
    name: 'searchMediaBrowserItemsHideTitle',
    label: 'Hide item row title text',
    required: false,
    selector: { boolean: {} },
  },
  {
    name: 'searchMediaBrowserItemsHideSubTitle',
    label: 'Hide item row sub-title text',
    help: 'if Title visible',
    required: false,
    selector: { boolean: {} },
  },
  {
    name: 'searchMediaBrowserQueueSelection',
    label: 'Queue track / episode when selected',
    help: 'otherwise play immediately',
    required: false,
    selector: { boolean: {} },
  },
];


class SearchMediaBrowserEditor extends BaseEditor {

  /**
   * Invoked on each update to perform rendering tasks. 
   * 
   * This method may return any value renderable by lit-html's `ChildPart` (typically a `TemplateResult`). 
   * Setting properties inside this method will *not* trigger the element to update.
  */
  protected render(): TemplateResult {

    // ensure store is created.
    super.createStore();

    // render html.
    return html`
      <div class="schema-title">
        Settings that control the Search Media section look and feel
      </div>
      <spc-editor-form class="spc-editor-form"
        .schema=${CONFIG_SETTINGS_SCHEMA}
        .section=${Section.SEARCH_MEDIA}
        .store=${this.store}
        .config=${this.config}
        .hass=${this.hass}
        @value-changed=${this.onValueChanged}
      ></spc-editor-form>
    `;
  }


  /**
   * Style definitions used by this TemplateResult.
   * 
   * Use the "spc-editor-form" class to apply styling to the elements that are dynamically defined by 
   * the HA-FORM element.  This gives you the ability to generate a more compact look and feel to the
   * element, which can save quite a bit of screen real-estate in the process!
   * See the static "styles()" function in the "editor.ts" module for more details.
   */
  static get styles() {
    return css`

      .schema-title {
        margin: 0.4rem 0;
        text-align: left;
        font-size: 1rem;
        color: var(--secondary-text-color);
      }

      /* control the look and feel of the HA-FORM element. */
      .spc-editor-form {
      }

      `;
  }


  /**
   * Handles a "value-changed" event.
   * This event is raised whenever a form value is changed in the UI.
   */
  protected onValueChanged(args: CustomEvent): void {

    // nothing to do here for this media type.
    // left the code here for future changes.
    if (args) {
    }

  }

}

customElements.define('spc-search-media-browser-editor', SearchMediaBrowserEditor);
