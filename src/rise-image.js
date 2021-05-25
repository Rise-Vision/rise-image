/* eslint-disable no-console, one-var */

import { RiseElement } from "rise-common-component/src/rise-element.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { WatchFilesMixin } from "rise-common-component/src/watch-files-mixin";
import { ValidFilesMixin } from "rise-common-component/src/valid-files-mixin";
import { version } from "./rise-image-version.js";
import "@polymer/iron-image/iron-image.js";

export const VALID_FILE_TYPES = [ "jpg", "jpeg", "png", "bmp", "svg", "gif", "webp" ];
export const MAXIMUM_TIME_FOR_FIRST_DOWNLOAD = 5 * 1000;

class RiseImage extends WatchFilesMixin( ValidFilesMixin( RiseElement )) {
  static get template() {
    return html`
      <style>
        :host {
          display: inline-block;
          overflow: hidden;
          position: relative;
          line-height: 0;
        }
      </style>
      <iron-image id="image"></iron-image>
    `;
  }

  static get properties() {
    return {
      files: {
        type: String,
        value: ""
      },
      metadata: {
        type: Array,
        value: null
      },
      width: {
        type: String,
        value: null
      },
      height: {
        type: String,
        value: null
      },
      sizing: {
        type: String,
        value: "contain"
      },
      position: {
        type: String,
        value: "center"
      },
      responsive: {
        type: Boolean,
        value: false
      },
      isLogo: {
        type: Boolean,
        value: false,
        observer: "_isLogoChanged"
      },
      logoFile: {
        type: String,
        value: "",
        readOnly: true
      },
      duration: {
        type: Number,
        value: 10
      }
    };
  }

  // Each item of observers array is a method name followed by
  // a comma-separated list of one or more dependencies.
  static get observers() {
    return [
      "_reset(files, logoFile, metadata, duration)"
    ]
  }

  static get EVENT_IMAGE_ERROR() {
    return "image-error";
  }

  static get EVENT_IMAGE_RESET() {
    return "image-reset";
  }

  static get EVENT_SVG_USAGE() {
    return "image-svg-usage";
  }

  constructor() {
    super();
    this._setVersion( version );

    this._validFiles = [];
    this._filesToRenderList = [];
    this._initialStart = true;
    this._transitionIndex = 0;
    this._transitionTimer = null;
    this._watchType = null;
    this._firstDownloadTimer = null;
    this._maximumTimeForFirstDownload = MAXIMUM_TIME_FOR_FIRST_DOWNLOAD;

    this._handleFirstDownloadTimer = this._handleFirstDownloadTimer.bind( this );
  }

  ready() {
    super.ready();
    this._configureImageEventListeners();
  }

  _handleRisePresentationPlay() {
    this._reset();
  }

  _handleRisePresentationStop() {
    this._stop();
  }

  _configureImageEventListeners() {
    this.$.image.addEventListener( "error-changed", ( event ) => {
      // This value is the 'error' property of <iron-image> and indicates if the last set src failed to load.
      const failed = event.detail.value;

      if ( !failed ) {
        // since it didn't fail, don't execute further
        return;
      }

      // to prevent test coverage failing
      if ( this._filesToRenderList.length === 0 ) {
        return;
      }

      const filePath = this._filesToRenderList[ this._transitionIndex ].filePath,
        fileUrl = this._filesToRenderList[ this._transitionIndex ].fileUrl,
        errorCode = fileUrl && fileUrl.startsWith(RiseImage.STORAGE_PREFIX) ? "E000000011" : "E000000200";

      super.log( RiseImage.LOG_TYPE_ERROR, "image-load-fail", {errorCode}, {
        storage: super.getStorageData( filePath, fileUrl )
      });
      this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, { filePath, errorMessage: "image load failed" });

      timeOut.cancel( this._transitionTimer );
      this._transitionTimer = null;
      this._onShowImageComplete();
    });

    this.$.image.addEventListener( "loaded-changed", event => {
      if ( event.detail.value === true ) {
        super._setUptimeError( false );
      }
    });
  }

  _isLogoChanged() {
    if ( this.isLogo ) {
      if ( !this._logoHandler ) {
        this._logoHandler = RisePlayerConfiguration.Branding.watchLogoFile( logoFile => {
          this._setLogoFile( logoFile );
        });
      }
    } else {
      this._logoHandler && this._logoHandler();
      this._logoHandler = null;

      this._setLogoFile( "" );
    }
  }

  _getFilesFromMetadata() {
    return !this.metadata ? [] : this.metadata.map(( entry ) => {
      return entry.file;
    });
  }

  _hasMetadata() {
    return !!this.metadata && this.metadata.length > 0;
  }

  _reset() {
    if ( !this._initialStart ) {
      const filesToLog = !this.metadata ? this.files : this._getFilesFromMetadata();

      this._stop();

      super.log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_IMAGE_RESET, null, {
        files: filesToLog, isLogo: this.isLogo, logoFile: this.logoFile
      });
      this._start();
    }
  }

  _isValidFilesString( files ) {
    if ( !files || typeof files !== "string" ) {
      return false;
    }

    // single symbol
    if ( files.indexOf( "|" ) === -1 ) {
      return true;
    }

    return files.split( "|" ).indexOf( "" ) === -1;
  }

  _getDataUrlFromSVGLocalUrl( file, localUrl ) {
    return new Promise(( resolve, reject ) => {
      const xhr = new XMLHttpRequest();

      xhr.overrideMimeType( "image/svg+xml" );

      xhr.onload = () => {
        if ( xhr.status !== 200 ) {
          reject( `${ xhr.status } : ${ xhr.statusText }` );
        }

        let reader = new FileReader();

        reader.onloadend = () => {
          if ( reader.error ) {
            reject( "Read failed" );
          }

          super.log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_SVG_USAGE, null, {
            svg_details: {
              blob_size: xhr.response.size,
              data_url_length: reader.result.length
            },
            storage: super.getStorageData( file, localUrl )
          });

          resolve( reader.result );
        };

        reader.readAsDataURL( xhr.response );
      };

      xhr.onerror = event => {
        reject( `Request failed: ${ JSON.stringify( event )}` );
      };

      xhr.open( "GET", localUrl );
      xhr.responseType = "blob";
      xhr.send();
    });
  }

  _renderImage( filePath, fileUrl ) {
    if ( this.responsive ) {
      this.$.image.updateStyles({ "--iron-image-width": "100%", "width": "100%", "height": "auto", "display": "inline-block" });
    } else {
      this.$.image.updateStyles({ "display": "inline-block" });
      if ( this.width ) {
        this.$.image.width = isNaN( this.width ) ? parseInt( this.width, 10 ) : this.width;
      } else {
        this.$.image.width = this.parentElement.clientWidth;
      }
      if ( this.height ) {
        this.$.image.height = isNaN( this.height ) ? parseInt( this.height, 10 ) : this.height;
      } else {
        this.$.image.height = this.parentElement.clientHeight;
      }
      this.$.image.sizing = this.sizing;
      this.$.image.position = this.position;
    }

    if ( this._watchType === RiseImage.WATCH_TYPE_RLS && super.getStorageFileFormat( filePath ) === "svg" ) {
      this._getDataUrlFromSVGLocalUrl( filePath, fileUrl )
        .then( dataUrl => {
          this.$.image.src = dataUrl;
        })
        .catch( error => {
          super.log( RiseImage.LOG_TYPE_ERROR, "image-svg-fail", {error, errorCode:"E000000012"} , {
            storage: super.getStorageData( filePath, fileUrl ),
            stack: error.stack
          });
          this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, { filePath, errorMessage: error });
        });
    } else {
      this.$.image.src = fileUrl;
    }
  }

  _clearDisplayedImage() {
    this.$.image.src = "";
    this.$.image.updateStyles({ "display": "none" });
  }

  _isDone() {
    return this._transitionIndex === this._filesToRenderList.length - 1 && this.hasAttribute( "play-until-done" );
  }

  _done() {
    if ( this._isDone()) {
      super._sendDoneEvent( true );
    }
  }

  _onShowImageComplete() {
    this._done();

    if ( this._transitionIndex < ( this._filesToRenderList.length - 1 )) {
      this._transitionIndex += 1;
      const fileToRender = this._filesToRenderList[ this._transitionIndex ];

      this._renderImage( fileToRender.filePath, fileToRender.fileUrl );
      this._startTransitionTimer();
    } else {
      this._configureShowingImages();
    }
  }

  _startTransitionTimer() {
    this.duration = parseInt( this.duration, 10 );

    if ( !isNaN( this.duration ) && this.duration !== 0 ) {
      timeOut.cancel( this._transitionTimer );
      this._transitionTimer = timeOut.run(() => this._onShowImageComplete(), this.duration * 1000 );
    }
  }

  _startEmptyPlayUntilDoneTimer() {
    if ( this.hasAttribute( "play-until-done" )) {
      const duration = parseInt( this.duration, 10 ) || 10;

      timeOut.cancel( this._transitionTimer );
      this._transitionTimer = timeOut.run(() => super._sendDoneEvent( true ), duration * 1000 );
    }
  }

  _configureShowingImages() {
    this._filesToRenderList = this.managedFiles
      .slice( 0 )
      .filter( f => this._validFiles.includes( f.filePath ));

    this._transitionIndex = 0;

    if ( this._filesToRenderList.length > 0 ) {
      const fileToRender = this._filesToRenderList[ this._transitionIndex ];

      this._clearFirstDownloadTimer();
      this._renderImage( fileToRender.filePath, fileToRender.fileUrl );

      this._startTransitionTimer();
    } else {
      this._clearDisplayedImage();
    }
  }

  _start() {
    const files = this.logoFile || this.files;
    let filesList;

    super.stopWatch();
    this._clearFirstDownloadTimer();

    if ( !this.logoFile && this._hasMetadata()) {
      filesList = this._getFilesFromMetadata();
    } else {
      if ( this._isValidFilesString( files )) {
        filesList = files.split( "|" )
          .map( f => f.trim())
          .filter( f => f.length > 0 );
      } else {
        filesList = [];
      }
    }

    const { validFiles } = super.validateFiles( filesList, VALID_FILE_TYPES );

    if ( !validFiles || !validFiles.length ) {
      this._validFiles = [];

      this._clearDisplayedImage();

      return this._startEmptyPlayUntilDoneTimer();
    } else {
      this._validFiles = validFiles;

      super.startWatch( validFiles )
        .then((watchType) => {
          this._watchType = watchType;
          this._waitForFirstDownload();
        })
        .catch(() => {
          if ( RisePlayerConfiguration.Helpers.isDisplay() ) {
            // Account for a Player local messaging connection problem (RLS)
            return this._startEmptyPlayUntilDoneTimer();
          }

          this._handleStartForPreview();
        });
    }
  }

  _stop() {
    this._validFiles = [];
    this._filesToRenderList = [];

    super.stopWatch();
    this._clearFirstDownloadTimer();
    this._watchType = null;

    /* NOTE
      No longer clearing the currently displayed image. This fixes a specific situation where there are multiple templates in a schedule that each use an image component for a background image and the user has applied the same image for each one. When we previously cleared the displayed image, this specific situation resulted in a split second visual flaw where the background css styling displayed and then the actual background image gets displayed. This would occur upon every transition of each template in the schedule.
     */

    timeOut.cancel( this._transitionTimer );
    this._transitionTimer = null;
    this._transitionIndex = 0;
  }

  _metadataEntryFor( file ) {
    return this.metadata.find( current => current.file === file );
  }

  _previewStatusFor( file ) {
    if ( this.isLogo || !this._hasMetadata()) {
      return "current";
    }

    const entry = this._metadataEntryFor( file );

    return entry && entry.exists ? "current" : "deleted";
  }

  _timeCreatedFor( file ) {
    if ( !this._hasMetadata()) {
      return "";
    }

    const entry = this._metadataEntryFor( file );

    return entry && entry[ "time-created" ] ? entry[ "time-created" ] : "";
  }

  _handleStartForPreview() {
    this._validFiles.forEach( file => super.handleFileStatusUpdated({
      filePath: file,
      fileUrl: this._getFileUrl( file ),
      status: this._previewStatusFor( file )
    }));
  }

  _handleStart(event) {
    super._handleStart( event );

    if ( this._initialStart ) {
      this._initialStart = false;

      super.log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_START, null, {
        files: this.files, isLogo: this.isLogo, logoFile: this.logoFile
      });

      this._start();
    }
  }

  _getFileUrl( file ) {
    let url = RiseImage.STORAGE_PREFIX + this._encodePath( file ) + "?_=" + this._timeCreatedFor( file );

    if (RisePlayerConfiguration.Helpers.getViewerType && RisePlayerConfiguration.Helpers.getViewerType()) {
      url += "&viewerType=" + RisePlayerConfiguration.Helpers.getViewerType();
    }

    if (RisePlayerConfiguration.Helpers.getViewerEnv && RisePlayerConfiguration.Helpers.getViewerEnv()) {
      url += "&viewerEnv=" + RisePlayerConfiguration.Helpers.getViewerEnv();
    }

    if (RisePlayerConfiguration.Helpers.getViewerId && RisePlayerConfiguration.Helpers.getViewerId()) {
      url += "&viewerId=" + RisePlayerConfiguration.Helpers.getViewerId();
    }

    return url;
  }

  _encodePath( filePath ) {
    // encode each element of the path separatly

    let encodedPath = filePath.split("/")
    .map( pathElement => encodeURIComponent( pathElement ))
    .join("/");

    return encodedPath;
  }

  watchedFileErrorCallback() {
    super._setUptimeError( true );

    if ( !this._filesToRenderList.length ) {
      this._done();
      this._clearDisplayedImage();
      this._startEmptyPlayUntilDoneTimer();
    }
  }

  watchedFileAddedCallback() {
    this._configureShowingImages();
  }

  watchedFileDeletedCallback( details ) {
    const { filePath } = details;

    if ( this._filesToRenderList.length === 1 && this._filePathIsRendered( filePath )) {
      this._filesToRenderList = [];
      this._clearDisplayedImage();
    }
  }

  _filePathIsRendered( filePath ) {
    return this._filesToRenderList.find( file => file.filePath === filePath );
  }

  _clearFirstDownloadTimer() {
    if ( this._firstDownloadTimer ) {
      clearTimeout( this._firstDownloadTimer );
      this._firstDownloadTimer = null;
    }
  }

  _waitForFirstDownload() {
    this._clearFirstDownloadTimer();

    this._firstDownloadTimer = setTimeout( this._handleFirstDownloadTimer, this._maximumTimeForFirstDownload );
  }

  _handleFirstDownloadTimer() {
    if ( !this.managedFiles.length && this.hasAttribute( "play-until-done" ) ) {
      super._sendDoneEvent( true );
    }
  }

  _sendImageEvent( eventName, detail = {}) {
    super._sendEvent( eventName, detail );

    switch ( eventName ) {
    case RiseImage.EVENT_IMAGE_ERROR:
      super._setUptimeError( true );
      break;
    case RiseImage.EVENT_IMAGE_RESET:
      super._setUptimeError( false );
      break;
    default:
    }
  }

}

customElements.define( "rise-image", RiseImage );
