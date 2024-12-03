// lovelace card imports.
import { css, html, TemplateResult } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import {
  mdiAccountMusic,
  mdiAlbum,
  mdiBookOpenVariant,
  mdiMicrophone,
  mdiMenuDown,
  mdiMusic,
  mdiPlaylistPlay,
  mdiPodcast,
} from '@mdi/js';

// our imports.
import '../components/media-browser-list';
import '../components/media-browser-icons';
import '../components/album-actions';
import '../components/artist-actions';
import '../components/audiobook-actions';
import '../components/episode-actions';
import '../components/playlist-actions';
import '../components/show-actions';
import '../components/track-actions';
import { sharedStylesFavBrowser } from '../styles/shared-styles-fav-browser.js';
import { FavBrowserBase } from './fav-browser-base';
import { Section } from '../types/section';
import { MediaPlayer } from '../model/media-player';
import { formatTitleInfo } from '../utils/media-browser-utils';
import { getUtcNowTimestamp } from '../utils/utils';
import { getIdFromSpotifyUri } from '../services/spotifyplus-service';
import { storageService } from '../decorators/storage';
import { SearchMediaTypes } from '../types/search-media-types';
import { SearchMediaEventArgs } from '../events/search-media';
import { ITrack } from '../types/spotifyplus/track';

// debug logging.
import Debug from 'debug/src/browser.js';
import { DEBUG_APP_NAME } from '../constants';
const debuglog = Debug(DEBUG_APP_NAME + ":search-media-browser");

/** Keys used to access cached storage items. */
const CACHE_KEY_SEARCH_MEDIA_TYPE = "_searchmediatype";
const CACHE_KEY_SEARCH_EVENT_ARGS = "_searcheventargs";

const SEARCH_FOR_PREFIX = "Search for ";

// basic search types that require filter criteria.
const SEARCH_TYPES_BASIC = [SearchMediaTypes.ALBUMS, SearchMediaTypes.ARTISTS, SearchMediaTypes.AUDIOBOOKS, SearchMediaTypes.EPISODES,
SearchMediaTypes.PLAYLISTS, SearchMediaTypes.SHOWS, SearchMediaTypes.TRACKS]


@customElement("spc-search-media-browser")
export class SearchBrowser extends FavBrowserBase {

  // private state properties.
  @state() private searchMediaType?: string;
  @state() private searchMediaTypeTitle?: string;
  @state() private searchEventArgs?: SearchMediaEventArgs | null;

  // html form element objects.
  @query("#searchMediaType", false) private searchMediaTypeElement!: HTMLElement;


  /**
   * Initializes a new instance of the class.
   */
  constructor() {

    // invoke base class method.
    super(Section.SEARCH_MEDIA);
    this.filterCriteriaPlaceholder = "search by name";

  }


  /**
   * Invoked on each update to perform rendering tasks. 
   * This method may return any value renderable by lit-html's `ChildPart` (typically a `TemplateResult`). 
   * Setting properties inside this method will *not* trigger the element to update.
  */
  protected render(): TemplateResult | void {

    // invoke base class method.
    super.render();

    // format title and sub-title details.
    const title = formatTitleInfo(this.config.searchMediaBrowserTitle, this.config, this.player, this.mediaListLastUpdatedOn, this.mediaList);
    const subtitle = formatTitleInfo(this.config.searchMediaBrowserSubTitle, this.config, this.player, this.mediaListLastUpdatedOn, this.mediaList);

    // get items per row based on configuration settings.
    // if not using search settings, then use individual media type settings.
    const searchType = this.searchMediaType;
    let itemsPerRow = this.config.searchMediaBrowserItemsPerRow || 4;
    if (!(this.config.searchMediaBrowserUseDisplaySettings || false)) {
      // general searches:
      if (searchType == SearchMediaTypes.ALBUMS) {
        itemsPerRow = this.config.albumFavBrowserItemsPerRow || 4;
      } else if (searchType == SearchMediaTypes.ARTISTS) {
        itemsPerRow = this.config.artistFavBrowserItemsPerRow || 4;
      } else if (searchType == SearchMediaTypes.AUDIOBOOKS) {
        itemsPerRow = this.config.audiobookFavBrowserItemsPerRow || 4;
      } else if (searchType == SearchMediaTypes.EPISODES) {
        itemsPerRow = this.config.episodeFavBrowserItemsPerRow || 4;
      } else if (searchType == SearchMediaTypes.PLAYLISTS) {
        itemsPerRow = this.config.playlistFavBrowserItemsPerRow || 4;
      } else if (searchType == SearchMediaTypes.SHOWS) {
        itemsPerRow = this.config.showFavBrowserItemsPerRow || 4;
      } else if (searchType == SearchMediaTypes.TRACKS) {
        itemsPerRow = this.config.trackFavBrowserItemsPerRow || 4;
        // album-specific searches:
      } else if (searchType == SearchMediaTypes.ALBUM_TRACKS) {
        itemsPerRow = this.config.trackFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
        // artists-specific searches:
      } else if (searchType == SearchMediaTypes.ARTIST_ALBUMS) {
        itemsPerRow = this.config.albumFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
      } else if (searchType == SearchMediaTypes.ARTIST_ALBUMS_APPEARSON) {
        itemsPerRow = this.config.albumFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
      } else if (searchType == SearchMediaTypes.ARTIST_ALBUMS_COMPILATION) {
        itemsPerRow = this.config.albumFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
      } else if (searchType == SearchMediaTypes.ARTIST_ALBUMS_SINGLE) {
        itemsPerRow = this.config.albumFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
      } else if (searchType == SearchMediaTypes.ARTIST_RELATED_ARTISTS) {
        itemsPerRow = this.config.artistFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
      } else if (searchType == SearchMediaTypes.ARTIST_TOP_TRACKS) {
        itemsPerRow = this.config.trackFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
        // audiobook-specific searches:
      } else if (searchType == SearchMediaTypes.AUDIOBOOK_EPISODES) {
        itemsPerRow = this.config.episodeFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
        // show-specific searches:
      } else if (searchType == SearchMediaTypes.SHOW_EPISODES) {
        itemsPerRow = this.config.episodeFavBrowserItemsPerRow || 4;
        this.isFilterCriteriaReadOnly = true;
      }
    }

    // update search media type if configuration options changed.
    if ((!this.isFilterCriteriaReadOnly) && (this.config.searchMediaBrowserSearchTypes) && (this.config.searchMediaBrowserSearchTypes.length > 0)) {
      if (!(this.config.searchMediaBrowserSearchTypes?.includes(this.searchMediaType as SearchMediaTypes))) {

        // hidden type is currently selected - reset current selection to first enabled
        // if a general search type is selected.
        this.searchMediaType = this.config.searchMediaBrowserSearchTypes[0];
        this.searchMediaTypeTitle = SEARCH_FOR_PREFIX + this.searchMediaType;

        // clear the media list, as the items no longer match the search media type.
        this.mediaList = undefined;
        this.mediaListLastUpdatedOn = 0;
        this.scrollTopSaved = 0;
      }
    }

    // set flags that control search media type menu item visibility.
    const isSearchArgsUriAlbum = ((this.searchEventArgs?.uri || "").indexOf(":album:") > -1);
    const isSearchArgsUriArtist = ((this.searchEventArgs?.uri || "").indexOf(":artist:") > -1);
    const isSearchArgsUriAudiobook = (((this.searchEventArgs?.uri || "").indexOf(":show:") > -1) && (this.searchEventArgs?.subtype == "audiobook"));
    const isSearchArgsUriShow = (((this.searchEventArgs?.uri || "").indexOf(":show:") > -1) && (this.searchEventArgs?.subtype == "podcast"));
    const isSearchArgsUri = isSearchArgsUriAlbum || isSearchArgsUriArtist || isSearchArgsUriAudiobook || isSearchArgsUriShow;

    // define control to render - search media type.
    const searchMediaTypeHtml = html`
      <ha-md-button-menu id="searchMediaType" slot="selection-bar" positioning="popover" style="padding-right: 0.5rem;">
        <ha-assist-chip id="searchMediaTypeTitle" slot="trigger" .label=${this.searchMediaTypeTitle || SEARCH_FOR_PREFIX + " ..."}>
          <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon>
        </ha-assist-chip>
        <ha-md-menu-item .value=${SearchMediaTypes.ALBUMS} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.ALBUMS)}>
          <ha-svg-icon slot="start" .path=${mdiAlbum}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ALBUMS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTISTS} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.ARTISTS)}>
          <ha-svg-icon slot="start" .path=${mdiAccountMusic}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTISTS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.AUDIOBOOKS} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.AUDIOBOOKS)}>
          <ha-svg-icon slot="start" .path=${mdiBookOpenVariant}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.AUDIOBOOKS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.EPISODES} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.EPISODES)}>
          <ha-svg-icon slot="start" .path=${mdiMicrophone}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.EPISODES}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.PLAYLISTS} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.PLAYLISTS)}>
          <ha-svg-icon slot="start" .path=${mdiPlaylistPlay}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.PLAYLISTS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.SHOWS} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.SHOWS)}>
          <ha-svg-icon slot="start" .path=${mdiPodcast}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.SHOWS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.TRACKS} @click=${this.onSearchMediaTypeChanged} hide=${this.hideSearchType(SearchMediaTypes.TRACKS)}>
          <ha-svg-icon slot="start" .path=${mdiMusic}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.TRACKS}</div>
        </ha-md-menu-item>
        <ha-md-divider role="separator" tabindex="-1" hide=${!isSearchArgsUri}></ha-md-divider>
        <ha-md-menu-item .value=${SearchMediaTypes.ALBUM_TRACKS} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriAlbum)}>
          <ha-svg-icon slot="start" .path=${mdiMusic}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ALBUM_TRACKS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTIST_TOP_TRACKS} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriArtist)}>
          <ha-svg-icon slot="start" .path=${mdiMusic}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTIST_TOP_TRACKS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTIST_ALBUMS} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriArtist)}>
          <ha-svg-icon slot="start" .path=${mdiAlbum}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTIST_ALBUMS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTIST_ALBUMS_COMPILATION} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriArtist)}>
          <ha-svg-icon slot="start" .path=${mdiAlbum}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTIST_ALBUMS_COMPILATION}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTIST_ALBUMS_SINGLE} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriArtist)}>
          <ha-svg-icon slot="start" .path=${mdiAlbum}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTIST_ALBUMS_SINGLE}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTIST_ALBUMS_APPEARSON} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriArtist)}>
          <ha-svg-icon slot="start" .path=${mdiAlbum}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTIST_ALBUMS_APPEARSON}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.ARTIST_RELATED_ARTISTS} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriArtist)}>
          <ha-svg-icon slot="start" .path=${mdiAccountMusic}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.ARTIST_RELATED_ARTISTS}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.AUDIOBOOK_EPISODES} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriAudiobook)}>
          <ha-svg-icon slot="start" .path=${mdiMicrophone}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.AUDIOBOOK_EPISODES}</div>
        </ha-md-menu-item>
        <ha-md-menu-item .value=${SearchMediaTypes.SHOW_EPISODES} @click=${this.onSearchMediaTypeChanged} hide=${(!isSearchArgsUriShow)}>
          <ha-svg-icon slot="start" .path=${mdiMicrophone}></ha-svg-icon>
          <div slot="headline">${SearchMediaTypes.SHOW_EPISODES}</div>
        </ha-md-menu-item>
      </ha-md-button-menu>
      `;

    // set scroll position (if needed).
    this.setScrollPosition();

    // render html.
    return html`

      <div class="media-browser-section">
        ${title ? html`<div class="media-browser-section-title">${title}</div>` : html``}
        ${subtitle ? html`<div class="media-browser-section-subtitle">${subtitle}</div>` : html``}
        <div class="search-media-browser-controls">
          ${!(this.isActionsVisible || false) ? html`` : html`${this.btnHideActionsHtml}`}
          ${searchMediaTypeHtml}
          ${(this.isFilterCriteriaVisible) ? html`
            ${(this.isFilterCriteriaReadOnly) ? html`${this.filterCriteriaReadOnlyHtml}` : html`${this.filterCriteriaHtml}`}
            ` : html``}
          ${this.refreshMediaListHtml}
        </div>
        <div id="mediaBrowserContentElement" class="media-browser-content">
          ${this.alertError ? html`<ha-alert alert-type="error" dismissable @alert-dismissed-clicked=${this.alertErrorClear}>${this.alertError}</ha-alert>` : ""}
          ${this.alertInfo ? html`<ha-alert alert-type="info" dismissable @alert-dismissed-clicked=${this.alertInfoClear}>${this.alertInfo}</ha-alert>` : ""}
          ${(() => {
            // if actions are not visbile, then render the media list.
            if (!this.isActionsVisible) {
              if (itemsPerRow === 1) {
                return (
                  html`<spc-media-browser-list class="media-browser-list"
                        .items=${this.mediaList}
                        .store=${this.store}
                        .searchMediaType=${this.searchMediaType}
                        @item-selected=${this.onItemSelected}
                        @item-selected-with-hold=${this.onItemSelectedWithHold}
                      ></spc-media-browser-list>`
                )
              } else {
                return (
                  html`<spc-media-browser-icons class="media-browser-list"
                        .items=${this.mediaList}
                        .store=${this.store}
                        .searchMediaType=${this.searchMediaType}
                        @item-selected=${this.onItemSelected}
                        @item-selected-with-hold=${this.onItemSelectedWithHold}
                      ></spc-media-browser-icons>`
                )
              }
              // if actions are visbile, then render the actions display.
            } else if ([SearchMediaTypes.ALBUMS, SearchMediaTypes.ARTIST_ALBUMS, SearchMediaTypes.ARTIST_ALBUMS_APPEARSON, SearchMediaTypes.ARTIST_ALBUMS_COMPILATION,
                        SearchMediaTypes.ARTIST_ALBUMS_SINGLE].indexOf(this.searchMediaType as any) > -1) {
              return (html`<spc-album-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-album-actions>`);
            } else if ([SearchMediaTypes.ARTISTS, SearchMediaTypes.ARTIST_RELATED_ARTISTS].indexOf(this.searchMediaType as any) > -1) {
              return (html`<spc-artist-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-artist-actions>`);
            } else if (this.searchMediaType == SearchMediaTypes.AUDIOBOOKS) {
              return (html`<spc-audiobook-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-audiobook-actions>`);
            } else if ([SearchMediaTypes.EPISODES, SearchMediaTypes.AUDIOBOOK_EPISODES, SearchMediaTypes.SHOW_EPISODES].indexOf(this.searchMediaType as any) > -1) {
              return (html`<spc-episode-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-episode-actions>`);
            } else if ([SearchMediaTypes.PLAYLISTS].indexOf(this.searchMediaType as any) > -1) {
              return (html`<spc-playlist-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-playlist-actions>`);
            } else if (this.searchMediaType == SearchMediaTypes.SHOWS) {
              return (html`<spc-show-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-show-actions>`);
            } else if ([SearchMediaTypes.TRACKS, SearchMediaTypes.ALBUM_TRACKS, SearchMediaTypes.ARTIST_TOP_TRACKS].indexOf(this.searchMediaType as any) > -1) {
              return (html`<spc-track-actions class="search-media-browser-actions" .store=${this.store} .mediaItem=${this.mediaItem}></spc-track-actions>`);
            } else {
              return (html``);
            }
          })()}
        </div>
      </div>
    `;
  }


  /** 
   * style definitions used by this component.
   * */
  static get styles() {

    return [
      sharedStylesFavBrowser,
      css`

      /* extra styles not defined in sharedStylesFavBrowser would go here. */

      .search-media-browser-controls {
        margin-top: 0.5rem;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
        margin-bottom: 0rem;
        white-space: nowrap;
        align-items: left;
        --ha-select-height: 2.5rem;           /* ha dropdown control height */
        --mdc-menu-item-height: 2.5rem;       /* mdc dropdown list item height */
        --mdc-icon-button-size: 2.5rem;       /* mdc icon button size */
        --md-menu-item-top-space: 0.5rem;     /* top spacing between items */
        --md-menu-item-bottom-space: 0.5rem;  /* bottom spacing between items */
        --md-menu-item-one-line-container-height: 2.0rem;  /* menu item height */
        display: inline-flex;
        flex-direction: row;
        justify-content: space-between;
      }

      .search-media-browser-actions {
        height: 100%;
      }

      /* <ha-md-button-menu> related styles */
      ha-assist-chip {
        --ha-assist-chip-container-shape: 10px;  /* 0px=square corner, 10px=rounded corner */
        --ha-assist-chip-container-color: var(--card-background-color);
      }

      .selection-bar {
        background: rgba(var(--rgb-primary-color), 0.1);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        box-sizing: border-box;
        font-size: 14px;
        --ha-assist-chip-container-color: var(--card-background-color);
      }

      .selection-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .selection-controls p {
        margin-left: 8px;
        margin-inline-start: 8px;
        margin-inline-end: initial;
      }

      .center-vertical {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .relative {
        position: relative;
      }

      *[hide="true"] {
        display: none;
      }

      *[hide="false"] {
        display: flex;
      }
    `
    ];
  }


  /**
   * Returns false if the specified feature is to be SHOWN; otherwise, returns true
   * if the specified feature is to be HIDDEN (via CSS).
   * 
   * @param searchType Search type to check.
   */
  private hideSearchType(searchType: SearchMediaTypes) {

    if ((this.config.searchMediaBrowserSearchTypes) && (this.config.searchMediaBrowserSearchTypes.length > 0)) {
      if (this.config.searchMediaBrowserSearchTypes?.includes(searchType as SearchMediaTypes)) {
        return false;  // show searchType
      } else if ((this.searchEventArgs) && (this.searchEventArgs?.searchCriteria == searchType)) {
        return false;  // show searchType
      } else {
        return true;   // hide searchType.
      }
    }

    // if features not configured, then show search type.
    return false;
  }


  /**
   * Execute search based on passed arguments.
   */
  public searchExecute(args: SearchMediaEventArgs): void {

    if (debuglog.enabled) {
      debuglog("searchExecute - searching Spotify media:\n%s",
        JSON.stringify(args,null,2),
      );
    }

    // prepare to search.
    this.initSearchValues(args.searchType);
    this.filterCriteria = args.searchCriteria;
    this.searchMediaType = args.searchType;

    if (SEARCH_TYPES_BASIC.includes(args.searchType)) {
      // if search type is a basic search item, then just reset search event args.
      this.searchEventArgs = null;
    } else {
      // otherwise, save the search arguments for later.
      this.searchEventArgs = args;
    }

    // execute the search.
    this.updateMediaList(this.player);

  }


  /**
   * Loads values from persistant storage.
   */
  protected override storageValuesLoad() {

    // invoke base class method.
    super.storageValuesLoad();

    // get default search type, based on enabled status.
    // we only need to do this if it's a basic search type (e.g. filter criteria is not readonly).
    // if none enabled, then use default; if default not enabled, then use first enabled.
    let defaultSearchType = SearchMediaTypes.PLAYLISTS;
    if (!this.isFilterCriteriaReadOnly) {
      if ((this.config.searchMediaBrowserSearchTypes) && (this.config.searchMediaBrowserSearchTypes.length > 0)) {
        if (!(this.config.searchMediaBrowserSearchTypes.includes(defaultSearchType))) {
          defaultSearchType = ((this.config?.searchMediaBrowserSearchTypes[0] || "") as SearchMediaTypes);
        }
      }
    }

    // load search-related values from the cache.
    this.searchMediaType = storageService.getStorageValue(this.cacheKeyBase + this.mediaType + CACHE_KEY_SEARCH_MEDIA_TYPE, defaultSearchType);
    this.searchEventArgs = storageService.getStorageValue(this.cacheKeyBase + this.mediaType + CACHE_KEY_SEARCH_EVENT_ARGS, defaultSearchType);
    this.searchMediaTypeTitle = SEARCH_FOR_PREFIX + this.searchMediaType;

    if (debuglog.enabled) {
      debuglog("storageValuesLoad - parameters loaded from cache: searchMediaType, searchEventArgs");
    }

  }


  /**
   * Saves values to persistant storage.
   */
  protected override storageValuesSave() {

    // invoke base class method.
    super.storageValuesSave();

    // save search-related values to the cache.
    storageService.setStorageValue(this.cacheKeyBase + this.mediaType + CACHE_KEY_SEARCH_MEDIA_TYPE, this.searchMediaType);
    storageService.setStorageValue(this.cacheKeyBase + this.mediaType + CACHE_KEY_SEARCH_EVENT_ARGS, this.searchEventArgs);

    if (debuglog.enabled) {
      debuglog("storageValuesSave - parameters saved to cache: searchMediaType, searchEventArgs");
    }

  }


  /**
   * Handles the click event of a search type menu item.
   * 
   * @param ev Event arguments (a SearchMediaTypes value).
   */
  private onSearchMediaTypeChanged(ev) {

    this.initSearchValues(ev.currentTarget.value);
    const selValue = ev.currentTarget.value;

    if (debuglog.enabled) {
      debuglog("onSearchMediaTypeChanged - selected value = %s ",
        JSON.stringify(selValue)
      );
    }

    if (SEARCH_TYPES_BASIC.includes(selValue)) {

      // if basic search item selected, then reset search event args.
      this.searchEventArgs = null;

    } else if (this.searchEventArgs) {

      // if extended search item selected, then update the media list.
      this.searchEventArgs.searchType = selValue;
      this.updateMediaList(this.player);

    } else {

      debuglog("%conSearchMediaTypeChanged - searchEventArgs not set; event ignored!", "color:red");

    }

  }


  /**
   * Initializes search fields and results, and prepare to search.  
   * 
   * This will set the search media type title, clear the media list results, reset
   * scroll position, clear alerts, and hide the actions display area.
   */
  private initSearchValues(searchType: string) {

    // if searchType did not change then don't bother.
    if (this.searchMediaType == searchType) {
      return;
    }

    if (debuglog.enabled) {
      debuglog("initSearchValues - preparing to search for type: %s",
        JSON.stringify(searchType),
      );
    }

    // store searchType and adjust the title.
    this.searchMediaType = searchType;
    this.searchMediaTypeTitle = SEARCH_FOR_PREFIX + this.searchMediaType;

    // clear the media list, as the items no longer match the search media type.
    this.mediaList = undefined;
    this.mediaListLastUpdatedOn = 0;
    this.scrollTopSaved = 0;

    // clear alerts.
    this.alertClear();

    // hide actions container (if visible).
    if (this.isActionsVisible) {
      this.isActionsVisible = false;
    }

  }


  /**
   * Updates the mediaList display.
   * 
   * @param player MediaPlayer object that will process the request.
   * 
   * @returns Return value is ignored when called from the inheriting class.
   */
  protected override updateMediaList(
    player: MediaPlayer,
    //updateType: SearchMediaTypes | null = null,
  ): boolean {

    // validations.
    if (!this.searchMediaType) {
      this.alertErrorSet("Please select the type of content to search for");
      this.searchMediaTypeElement.focus();
      return false;
    }

    if ((!this.isFilterCriteriaReadOnly) && (!this.filterCriteria)) {
      this.alertErrorSet("Please enter criteria to search for");
      this.filterCriteriaElement.focus();
      return false;
    }

    // invoke base class method; if it returns false, then we should not update the media list.
    if (!super.updateMediaList(player)) {
      return false;
    }

    try {

      // we use the `Promise.allSettled` approach here like we do with actions, so
      // that we can easily add promises if more data gathering is needed in the future.
      const promiseRequests = new Array<Promise<unknown>>();

      if (debuglog.enabled) {
        debuglog("%cupdateMediaList\n- mediaType = %s\n- searchMediaType = %s\n- searchEventArgs = %s",
          "color:green",
          JSON.stringify(this.mediaType),
          JSON.stringify(this.searchMediaType),
          JSON.stringify(this.searchEventArgs, null, 2)
        );
      }

      //// was main menu selected?
      //if (this.searchMediaType == SearchMediaTypes.MAIN_MENU) {

      //  // build media list.
      //  const result = new Array<IUserPreset>();
      //  result.push(<IUserPreset>{ name: SearchMediaTypes.ALBUM_NEW_RELEASES, subtitle: "", image_url: getMdiIconImageUrl(mdiAlbum), type: SEARCH_MENU_TYPE, uri: SEARCH_MENU_NEW_RELEASES });
      //  //result.push(<IUserPreset>{ name: SearchMediaTypes.PLAYLISTS_FEATURED, subtitle: "", image_url: getMdiIconImageUrl(mdiPlaylistPlay), type: SEARCH_MENU_TYPE, uri: SEARCH_MENU_FEATURED_PLAYLISTS });

      //  // load media list results.
      //  this.mediaList = result;
      //  this.mediaListLastUpdatedOn = getUtcNowTimestamp();

      //  if (debuglog.enabled) {
      //    debuglog("updateMediaList - Search Main Menu items:\n%s",
      //      JSON.stringify(result, null, 2)
      //    );
      //  }

      //  // call base class method, indicating media list update succeeded.
      //  this.isUpdateInProgress = false;
      //  super.updatedMediaListOk();
      //  return true;

      if (SEARCH_TYPES_BASIC.includes(this.searchMediaType as any)) {

        // create promise - basic search.
        const promiseUpdateMediaList = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching Spotify " + this.searchMediaType + " catalog for \"" + this.filterCriteria + "\" ...";

          // set service parameters.
          const limitTotal = this.config.searchMediaBrowserSearchLimit || 50;
          const market: string | null = null;            // market code.
          const includeExternal: string | null = null;   // include_exclude code.

          // call the service to retrieve the media list.
          this.spotifyPlusService.Search(this.searchMediaType as SearchMediaTypes, player.id, this.filterCriteria || "", 0, 0, market, includeExternal, limitTotal)
            .then(result => {

              // load media list results.
              this.mediaList = result.items as [any];
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseUpdateMediaList);

      } else if (this.searchMediaType == SearchMediaTypes.ALBUM_TRACKS) {

        // create promise - get album tracks.
        const promiseGetAlbumTracks = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const albumId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const limit_total = this.config.searchMediaBrowserSearchLimit || 50;
          const market = null;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetAlbumTracks(player.id, albumId, 0, 0, market, limit_total)
            .then(result => {

              if (debuglog.enabled) {
                debuglog("%cupdateMediaList - Appending album to SearchMediaTypes.ALBUM_TRACKS items.\n- Album parentMediaItem:\n%s",
                  "color.red",
                  JSON.stringify(this.searchEventArgs?.parentMediaItem, null, 2),
                );
              }

              // add parent album info to ITrackSimplified objects so that we can just use
              // the <spc-track-actions> control (it requires an ITrack object).  we do this
              // because ITrackSimplified objects do not contain an `album` object.
              result.items.forEach(item => {
                const track = item as ITrack;
                track.album = this.searchEventArgs?.parentMediaItem;
                if (track.album) {
                  track.image_url = track.album.image_url;
                }
              })

              // load media list results.
              this.mediaList = result.items;
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetAlbumTracks);

      } else if (this.searchMediaType == SearchMediaTypes.ARTIST_ALBUMS) {

        // create promise - get artists' compilation albums.
        const promiseGetArtistAlbums = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const artistId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const market = null;
          const include_groups = "album";
          const limit_total = this.config.searchMediaBrowserSearchLimit || 50;
          const sort_result = this.config.artistFavBrowserItemsSortTitle || false;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetArtistAlbums(player.id, artistId, include_groups, 0, 0, market, limit_total, sort_result)
            .then(result => {

              // load media list results.
              this.mediaList = result.items;
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetArtistAlbums);

      } else if (this.searchMediaType == SearchMediaTypes.ARTIST_ALBUMS_APPEARSON) {

        // create promise - get artists' compilation albums.
        const promiseGetArtistAlbumsAppearsOn = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const artistId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const market = null;
          const include_groups = "appears_on";
          const limit_total = this.config.searchMediaBrowserSearchLimit || 50;
          const sort_result = this.config.artistFavBrowserItemsSortTitle || false;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetArtistAlbums(player.id, artistId, include_groups, 0, 0, market, limit_total, sort_result)
            .then(result => {

              // load media list results.
              this.mediaList = result.items;
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetArtistAlbumsAppearsOn);

      } else if (this.searchMediaType == SearchMediaTypes.ARTIST_ALBUMS_COMPILATION) {

        // create promise - get artists' compilation albums.
        const promiseGetArtistAlbumsCompilation = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const artistId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const market = null;
          const include_groups = "compilation";
          const limit_total = this.config.searchMediaBrowserSearchLimit || 50;
          const sort_result = this.config.artistFavBrowserItemsSortTitle || false;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetArtistAlbums(player.id, artistId, include_groups, 0, 0, market, limit_total, sort_result)
            .then(result => {

              // load media list results.
              this.mediaList = result.items;
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetArtistAlbumsCompilation);

      } else if (this.searchMediaType == SearchMediaTypes.ARTIST_ALBUMS_SINGLE) {

        // create promise - get artists' compilation albums.
        const promiseGetArtistAlbumsSingle = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const artistId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const market = null;
          const include_groups = "single";
          const limit_total = this.config.searchMediaBrowserSearchLimit || 50;
          const sort_result = this.config.artistFavBrowserItemsSortTitle || false;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetArtistAlbums(player.id, artistId, include_groups, 0, 0, market, limit_total, sort_result)
            .then(result => {

              // load media list results.
              this.mediaList = result.items;
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetArtistAlbumsSingle);

      } else if (this.searchMediaType == SearchMediaTypes.ARTIST_RELATED_ARTISTS) {

        // create promise - get artists' related artists.
        const promiseGetArtistRelatedArtists = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const artistId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const sortResult = this.config.searchMediaBrowserItemsSortTitle || false;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetArtistRelatedArtists(player.id, artistId, sortResult)
            .then(result => {

              // load media list results.
              this.mediaList = result;
              this.mediaListLastUpdatedOn = getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetArtistRelatedArtists);

      } else if (this.searchMediaType == SearchMediaTypes.ARTIST_TOP_TRACKS) {

        // create promise - get artists' top tracks.
        const promiseGetArtistTopTracks = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const artistId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const sortResult = this.config.searchMediaBrowserItemsSortTitle || false;
          const market = null;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetArtistTopTracks(player.id, artistId, market, sortResult)
            .then(result => {

              // load media list results.
              this.mediaList = result;
              this.mediaListLastUpdatedOn = getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetArtistTopTracks);

      } else if (this.searchMediaType == SearchMediaTypes.SHOW_EPISODES) {

        // create promise - get show episodes.
        const promiseGetShowEpisodes = new Promise((resolve, reject) => {

          // update status.
          this.alertInfo = "Searching " + this.searchMediaType + " for \"" + this.searchEventArgs?.title + "\" ...";

          // set service parameters.
          const showId = getIdFromSpotifyUri(this.searchEventArgs?.uri);
          const market = null;
          const limit_total = this.config.searchMediaBrowserSearchLimit || 50;

          // call the service to retrieve the media list.
          this.spotifyPlusService.GetShowEpisodes(player.id, showId, 0, 0, market, limit_total)
            .then(result => {

              // load media list results.
              this.mediaList = result.items;
              this.mediaListLastUpdatedOn = result.date_last_refreshed || getUtcNowTimestamp();

              // clear certain info messsages if they are temporary.
              if (this.alertInfo?.startsWith("Searching ")) {
                this.alertInfoClear();
              }

              // call base class method, indicating media list update succeeded.
              super.updatedMediaListOk();
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.mediaList = undefined;
              this.mediaListLastUpdatedOn = 0;

              // call base class method, indicating media list update failed.
              super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
              reject(error);

            })
        });

        promiseRequests.push(promiseGetShowEpisodes);

      } else {

        // if no search type was selected, then log it as we will need to modify code.
        this.isUpdateInProgress = false;

        console.log("%cSpotifyPlus Card: updateMediaList - searchMediaType was not processed:\n- mediaType = %s\n- searchMediaType = %s\n- searchEventArgs = %s",
          "color:red",
          JSON.stringify(this.mediaType),
          JSON.stringify(this.searchMediaType),
          JSON.stringify(this.searchEventArgs, null, 2)
        );

      }

      // show visual progress indicator.
      this.progressShow();

      // execute all promises, and wait for all of them to settle.
      // we use `finally` logic so we can clear the progress indicator.
      // any exceptions raised should have already been handled in the 
      // individual promise definitions; nothing else to do at this point.
      Promise.allSettled(promiseRequests).finally(() => {

        // clear the progress indicator.
        this.progressHide();

      });

      return true;

    }
    catch (error) {

      // clear the progress indicator.
      this.progressHide();

      // set alert error message.
      super.updatedMediaListError("Spotify " + this.searchMediaType + " search failed: " + (error as Error).message);
      return true;

    }
    finally {
    }

  }

}
