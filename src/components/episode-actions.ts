// lovelace card imports.
import { css, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import copyTextToClipboard from 'copy-text-to-clipboard';
import {
  mdiBookmarkMusicOutline,
  mdiClipboardPlusOutline,
  mdiDotsHorizontal,
  mdiHeart,
  mdiHeartOutline,
  mdiMicrophone,
  mdiPodcast,
} from '@mdi/js';

// our imports.
import { sharedStylesGrid } from '../styles/shared-styles-grid.js';
import { sharedStylesMediaInfo } from '../styles/shared-styles-media-info.js';
import { sharedStylesFavActions } from '../styles/shared-styles-fav-actions.js';
import { FavActionsBase } from './fav-actions-base';
import { Section } from '../types/section';
import { MediaPlayer } from '../model/media-player';
import { SearchMediaTypes } from '../types/search-media-types';
import { SearchMediaEvent } from '../events/search-media';
import { formatDateHHMMSSFromMilliseconds, getHomeAssistantErrorMessage, unescapeHtml } from '../utils/utils';
import { openWindowNewTab } from '../utils/media-browser-utils';
import { ALERT_INFO_PRESET_COPIED_TO_CLIPBOARD, ALERT_INFO_PRESET_JSON_COPIED_TO_CLIPBOARD } from '../constants';
import { GetUserPresetConfigEntry, GetUserPresetConfigEntryJson } from '../types/spotifyplus/user-preset';
import { IEpisode, isEpisodeObject } from '../types/spotifyplus/episode';
import { IEpisodeSimplified } from '../types/spotifyplus/episode-simplified';

/**
 * Episode actions.
 */
enum Actions {
  EpisodeCopyPresetToClipboard = "EpisodeCopyPresetToClipboard",
  EpisodeCopyPresetJsonToClipboard = "EpisodeCopyPresetJsonToClipboard",
  EpisodeCopyUriToClipboard = "EpisodeCopyUriToClipboard",
  EpisodeFavoriteAdd = "EpisodeFavoriteAdd",
  EpisodeFavoriteRemove = "EpisodeFavoriteRemove",
  EpisodeFavoriteUpdate = "EpisodeFavoriteUpdate",
  EpisodeUpdate = "EpisodeUpdate",
  ShowCopyPresetToClipboard = "ShowCopyPresetToClipboard",
  ShowCopyPresetJsonToClipboard = "ShowCopyPresetJsonToClipboard",
  ShowCopyUriToClipboard = "ShowCopyUriToClipboard",
  ShowFavoriteAdd = "ShowFavoriteAdd",
  ShowFavoriteRemove = "ShowFavoriteRemove",
  ShowFavoriteUpdate = "ShowFavoriteUpdate",
  ShowSearchEpisodes = "ShowSearchEpisodes",
}


class EpisodeActions extends FavActionsBase {

  // public state properties.
  @property({ attribute: false }) mediaItem!: IEpisodeSimplified | IEpisode;

  // private state properties.
  @state() private isEpisodeFavorite?: boolean;
  @state() private isShowFavorite?: boolean;
  @state() private episode?: IEpisode;


  /**
   * Initializes a new instance of the class.
   */
  constructor() {

    // invoke base class method.
    super(Section.EPISODE_FAVORITES);

  }


  /**
   * Invoked on each update to perform rendering tasks. 
   * This method may return any value renderable by lit-html's `ChildPart` (typically a `TemplateResult`). 
   * Setting properties inside this method will *not* trigger the element to update.
  */
  protected override render(): TemplateResult | void {

    // invoke base class method.
    super.render();

    // define actions.
    const actionShowFavoriteAdd = html`
      <div class="display-inline">
        <ha-icon-button 
          .path=${mdiHeartOutline}
          label="Add Show &quot;${this.episode?.show.name}&quot; to Favorites"
          @click=${() => this.onClickAction(Actions.ShowFavoriteAdd)}
          slot="icon-button-small"
        ></ha-icon-button>
      </div>
     `;

    const actionShowFavoriteRemove = html`
      <div class="display-inline">
        <ha-icon-button 
          .path=${mdiHeart}
          label="Remove Show &quot;${this.episode?.show.name}&quot; from Favorites"
          @click=${() => this.onClickAction(Actions.ShowFavoriteRemove)}
          slot="icon-button-small-selected"
        ></ha-icon-button>
      </div>
     `;

    const actionEpisodeFavoriteAdd = html`
      <div class="display-inline">
        <ha-icon-button
          .path=${mdiHeartOutline}
          label="Add Episode &quot;${this.episode?.name}&quot; to Favorites"
          @click=${() => this.onClickAction(Actions.EpisodeFavoriteAdd)}
          slot="icon-button-small"
        ></ha-icon-button>
      </div>
     `;

    const actionEpisodeFavoriteRemove = html`
      <div class="display-inline">
        <ha-icon-button
          .path=${mdiHeart}
          label="Remove Episode &quot;${this.episode?.name}&quot; from Favorites"
          @click=${() => this.onClickAction(Actions.EpisodeFavoriteRemove)}
          slot="icon-button-small-selected"
        ></ha-icon-button>
      </div>
     `;

    // define supporting icons.
    const iconShow = html`
      <div class="display-inline">
        <ha-icon-button
          .path=${mdiPodcast}
          .label="View Show &quot;${this.episode?.show.name}&quot; info on Spotify.com"
          @click=${() => openWindowNewTab(this.episode?.show.external_urls.spotify || "")}
          slot="icon-button-small"
        ></ha-icon-button>
      </div>
     `;

    const iconEpisode = html`
      <div class="display-inline">
        <ha-icon-button
          .path=${mdiMicrophone}
          .label="View Episode &quot;${this.episode?.name}&quot; info on Spotify.com"
          @click=${() => openWindowNewTab(this.episode?.external_urls.spotify || "")}
          slot="icon-button-small"
        ></ha-icon-button>
      </div>
     `;

    // define dropdown menu actions - show.
    const actionsShowHtml = html`
      <ha-md-button-menu slot="selection-bar" positioning="popover">
        <ha-assist-chip slot="trigger">
          <ha-svg-icon slot="icon" .path=${mdiDotsHorizontal}></ha-svg-icon>
        </ha-assist-chip>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.ShowSearchEpisodes)} hide=${this.hideSearchType(SearchMediaTypes.EPISODES)}>
          <ha-svg-icon slot="start" .path=${mdiMicrophone}></ha-svg-icon>
          <div slot="headline">Search for Show Episodes</div>
        </ha-md-menu-item>
        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.ShowCopyUriToClipboard)}>
          <ha-svg-icon slot="start" .path=${mdiClipboardPlusOutline}></ha-svg-icon>
          <div slot="headline">Copy Show URI to Clipboard</div>
        </ha-md-menu-item>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.ShowCopyPresetToClipboard)}>
          <ha-svg-icon slot="start" .path=${mdiBookmarkMusicOutline}></ha-svg-icon>
          <div slot="headline">Copy Show Preset Info to Clipboard</div>
        </ha-md-menu-item>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.ShowCopyPresetJsonToClipboard)}>
          <ha-svg-icon slot="start" .path=${mdiBookmarkMusicOutline}></ha-svg-icon>
          <div slot="headline">Copy Show Preset JSON to Clipboard</div>
        </ha-md-menu-item>
      </ha-md-button-menu>
      `;

    // define dropdown menu actions - episode.
    const actionsEpisodeHtml = html`
      <ha-md-button-menu slot="selection-bar" positioning="popover">
        <ha-assist-chip slot="trigger">
          <ha-svg-icon slot="icon" .path=${mdiDotsHorizontal}></ha-svg-icon>
        </ha-assist-chip>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.EpisodeCopyUriToClipboard)}>
          <ha-svg-icon slot="start" .path=${mdiClipboardPlusOutline}></ha-svg-icon>
          <div slot="headline">Copy Episode URI to Clipboard</div>
        </ha-md-menu-item>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.EpisodeCopyPresetToClipboard)}>
          <ha-svg-icon slot="start" .path=${mdiBookmarkMusicOutline}></ha-svg-icon>
          <div slot="headline">Copy Episode Preset Info to Clipboard</div>
        </ha-md-menu-item>
        <ha-md-menu-item @click=${() => this.onClickAction(Actions.EpisodeCopyPresetJsonToClipboard)}>
          <ha-svg-icon slot="start" .path=${mdiBookmarkMusicOutline}></ha-svg-icon>
          <div slot="headline">Copy Episode Preset JSON to Clipboard</div>
        </ha-md-menu-item>
      </ha-md-button-menu>
      `;

    // render html.
    // note that mediaItem could be an IEpisode or IEpisodeSimplified object.
    return html` 
      <div class="episode-actions-container">
        ${this.alertError ? html`<ha-alert alert-type="error" dismissable @alert-dismissed-clicked=${this.alertErrorClear}>${this.alertError}</ha-alert>` : ""}
        ${this.alertInfo ? html`<ha-alert alert-type="info" dismissable @alert-dismissed-clicked=${this.alertInfoClear}>${this.alertInfo}</ha-alert>` : ""}
        <div class="media-info-content">
          <div class="img" style="background:url(${this.episode?.image_url});"></div>
          <div class="media-info-details">
            <div class="media-info-text-ms-c">
              ${iconEpisode}
              ${this.episode?.name}
              ${(this.isEpisodeFavorite ? actionEpisodeFavoriteRemove : actionEpisodeFavoriteAdd)}
              <span class="actions-dropdown-menu">
                ${actionsEpisodeHtml}
              </span>
            </div>
            <div class="media-info-text-ms">
              ${iconShow}
              ${this.episode?.show.name}
              ${(this.isShowFavorite ? actionShowFavoriteRemove : actionShowFavoriteAdd)}
              <span class="actions-dropdown-menu">
                ${actionsShowHtml}
              </span>
            </div>
            <div class="grid episode-info-grid">
              <div class="grid-action-info-hdr-s">Duration</div>
              <div class="grid-action-info-text-s">${formatDateHHMMSSFromMilliseconds(this.episode?.duration_ms || 0)}</div>
              <div class="grid-action-info-text-s">&nbsp;</div>
              <div class="grid-action-info-hdr-s">Released</div>
              <div class="grid-action-info-text-s">${this.episode?.release_date}</div>

              <div class="grid-action-info-hdr-s">Explicit</div>
              <div class="grid-action-info-text-s">${this.episode?.explicit || false}</div>
              <div class="grid-action-info-text-s">&nbsp;</div>
              <div class="grid-action-info-hdr-s">Links</div>
              <div class="grid-action-info-text-s">
                <ha-icon-button style="padding-left:10px;"
                  .path=${mdiPodcast}
                  label="View Show &quot;${this.episode?.show.name}&quot; info on Spotify.com"
                  @click=${() => openWindowNewTab(this.episode?.show.external_urls.spotify || "")}
                  slot="media-info-icon-link-s"
                ></ha-icon-button>
                <ha-icon-button style="padding-left:10px;"
                  .path=${mdiMicrophone}
                  label="View Episode &quot;${this.episode?.name}&quot; info on Spotify.com"
                  @click=${() => openWindowNewTab(this.episode?.external_urls.spotify || "")}
                  slot="media-info-icon-link-s"
                ></ha-icon-button>
              </div>

            </div>
          </div>
        </div>
        <div class="media-info-description">
          <div class="media-info-text-s" .innerHTML="${unescapeHtml(this.episode?.html_description || "")}"></div>
        </div>
      </div>
      `;
  }


  /**
   * style definitions used by this component.
   * */
  static get styles() {
    return [
      sharedStylesGrid,
      sharedStylesMediaInfo,
      sharedStylesFavActions,
      css`

      .episode-info-grid {
        grid-template-columns: auto auto 30px auto auto;
        justify-content: left;
      }

      .episode-actions-container {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;  
      }
    `
    ];
  }


  /**
   * Handles the `click` event fired when a control icon is clicked.
   * 
   * @param action Action to execute.
   * @param args Action arguments.
   */
  protected override async onClickAction(action: Actions): Promise<boolean> {

    // if card is being edited, then don't bother.
    if (this.isCardInEditPreview) {
      return true;
    }

    try {

      // process actions that don't require a progress indicator.
      if (action == Actions.EpisodeCopyPresetToClipboard) {

        copyTextToClipboard(GetUserPresetConfigEntry(this.episode, this.episode?.show.name));
        this.alertInfoSet(ALERT_INFO_PRESET_COPIED_TO_CLIPBOARD);
        return true;

      } else if (action == Actions.EpisodeCopyPresetJsonToClipboard) {

        copyTextToClipboard(GetUserPresetConfigEntryJson(this.episode, this.episode?.show.name));
        this.alertInfoSet(ALERT_INFO_PRESET_JSON_COPIED_TO_CLIPBOARD);
        return true;

      } else if (action == Actions.EpisodeCopyUriToClipboard) {

        copyTextToClipboard(this.episode?.uri || "");
        return true;

      } else if (action == Actions.ShowCopyPresetToClipboard) {

        copyTextToClipboard(GetUserPresetConfigEntry(this.episode?.show, "Podcast"));
        this.alertInfoSet(ALERT_INFO_PRESET_COPIED_TO_CLIPBOARD);
        return true;

      } else if (action == Actions.ShowCopyPresetJsonToClipboard) {

        copyTextToClipboard(GetUserPresetConfigEntryJson(this.episode?.show, "Podcast"));
        this.alertInfoSet(ALERT_INFO_PRESET_JSON_COPIED_TO_CLIPBOARD);
        return true;

      } else if (action == Actions.ShowCopyUriToClipboard) {

        copyTextToClipboard(this.episode?.show.uri || "");
        return true;

      } else if (action == Actions.ShowSearchEpisodes) {

        this.dispatchEvent(SearchMediaEvent(SearchMediaTypes.SHOW_EPISODES, this.episode?.show.name, this.episode?.show.name, this.episode?.show.uri));
        return true;

      }

      // show progress indicator.
      this.progressShow();

      // call service based on requested action, and refresh affected action component.
      if (action == Actions.EpisodeFavoriteAdd) {

        await this.spotifyPlusService.SaveEpisodeFavorites(this.player, this.episode?.id);
        this.updateActions(this.player, [Actions.EpisodeFavoriteUpdate]);

      } else if (action == Actions.EpisodeFavoriteRemove) {

        await this.spotifyPlusService.RemoveEpisodeFavorites(this.player, this.episode?.id);
        this.updateActions(this.player, [Actions.EpisodeFavoriteUpdate]);

      } else if (action == Actions.ShowFavoriteAdd) {

        await this.spotifyPlusService.SaveShowFavorites(this.player, this.episode?.show.id);
        this.updateActions(this.player, [Actions.ShowFavoriteUpdate]);

      } else if (action == Actions.ShowFavoriteRemove) {

        await this.spotifyPlusService.RemoveShowFavorites(this.player, this.episode?.show.id);
        this.updateActions(this.player, [Actions.ShowFavoriteUpdate]);

      } else {

        // no action selected - hide progress indicator.
        this.progressHide();

      }

      return true;
    }
    catch (error) {

      // clear the progress indicator and set alert error message.
      this.progressHide();
      this.alertErrorSet("Action failed: " + getHomeAssistantErrorMessage(error));
      return true;

    }
    finally {
    }

  }


  /**
   * Updates body actions.
   * 
   * @param player Media player instance that will process the update.
   * @param updateActions List of actions that need to be updated, or an empty list to update DEFAULT actions.
   * @returns True if actions update should continue after calling base class method; otherwise, False to abort actions update.
   */
  protected override updateActions(
    player: MediaPlayer,
    updateActions: any[],
  ): boolean {

    // invoke base class method; if it returns false, then we should not update actions.
    if (!super.updateActions(player, updateActions)) {
      return false;
    }

    try {

      const promiseRequests = new Array<Promise<unknown>>();

      // was this action chosen to be updated?
      if ((updateActions.indexOf(Actions.EpisodeUpdate) != -1) || (updateActions.length == 0)) {

        // reset favorite indicators.
        this.isEpisodeFavorite = undefined;
        this.isShowFavorite = undefined;

        // determine if the mediaItem implements the IEpisode interface.
        // if it's IEpisode, then just set the episode reference from mediaItem.
        // if it's IEpisodeSimplified, then we need to get the full IEpisode.
        if (isEpisodeObject(this.mediaItem)) {

          // set the episode reference from mediaItem.
          this.episode = this.mediaItem;

          // indicate we are no longer updating.
          this.isUpdateInProgress = false;

          // update the favorite settings.
          setTimeout(() => {
            this.updateActions(player, [Actions.EpisodeFavoriteUpdate, Actions.ShowFavoriteUpdate]);
          }, 50);

          return true;
        }

        // create promise - update currently selected media item.
        const promiseEpisodeUpdate = new Promise((resolve, reject) => {

          // call service to retrieve media item that is currently selected.
          this.spotifyPlusService.GetEpisode(player, this.mediaItem.id)
            .then(result => {

              // load results, update favorites, and resolve the promise.
              this.episode = result;

              // update the favorite settings.
              setTimeout(() => {
                this.updateActions(player, [Actions.EpisodeFavoriteUpdate, Actions.ShowFavoriteUpdate]);
              }, 50);
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.episode = undefined;
              this.alertErrorSet("Get Episode call failed: " + getHomeAssistantErrorMessage(error));
              reject(error);

            })
        });

        promiseRequests.push(promiseEpisodeUpdate);
      }

      // was this action chosen to be updated?
      if (updateActions.indexOf(Actions.ShowFavoriteUpdate) != -1) {

        // create promise - check favorite status.
        const promiseCheckShowFavorites = new Promise((resolve, reject) => {

          // call service to retrieve favorite setting.
          this.spotifyPlusService.CheckShowFavorites(player, this.episode?.show.id)
            .then(result => {

              // load results, and resolve the promise.
              // only 1 result is returned, so just take the first key value.
              this.isShowFavorite = result[Object.keys(result)[0]];
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.isShowFavorite = undefined;
              this.alertErrorSet("Check Show Favorite failed: " + getHomeAssistantErrorMessage(error));
              reject(error);

            })
        });

        promiseRequests.push(promiseCheckShowFavorites);
      }

      // was this action chosen to be updated?
      if (updateActions.indexOf(Actions.EpisodeFavoriteUpdate) != -1) {

        // create promise - check favorite status.
        const promiseCheckEpisodeFavorites = new Promise((resolve, reject) => {

          // call service to retrieve favorite setting.
          this.spotifyPlusService.CheckEpisodeFavorites(player, this.episode?.id)
            .then(result => {

              // load results, and resolve the promise.
              // only 1 result is returned, so just take the first key value.
              this.isEpisodeFavorite = result[Object.keys(result)[0]];
              resolve(true);

            })
            .catch(error => {

              // clear results, and reject the promise.
              this.isEpisodeFavorite = undefined;
              this.alertErrorSet("Check Episode Favorites failed: " + getHomeAssistantErrorMessage(error));
              reject(error);

            })
        });

        promiseRequests.push(promiseCheckEpisodeFavorites);
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

      // clear the progress indicator and set alert error message.
      this.progressHide();
      this.alertErrorSet("Episode actions refresh failed: " + getHomeAssistantErrorMessage(error));
      return true;

    }
    finally {
    }
  }

}

customElements.define('spc-episode-actions', EpisodeActions);
