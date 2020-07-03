/* eslint-disable no-console, one-var */

import { RiseElement } from "rise-common-component/src/rise-element.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { WatchFilesMixin } from "rise-common-component/src/watch-files-mixin";
import { ValidFilesMixin } from "rise-common-component/src/valid-files-mixin";
import { StoreFilesMixin } from "rise-common-component/src/store-files-mixin";
import { version } from "./rise-image-version.js";
import "@polymer/iron-image/iron-image.js";

export const VALID_FILE_TYPES = [ "jpg", "jpeg", "png", "bmp", "svg", "gif", "webp" ];

const base = StoreFilesMixin(RiseElement);

class RiseImage extends WatchFilesMixin( ValidFilesMixin( base )) {
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
  }

  ready() {
    super.ready();
    this._configureImageEventListeners();

    this.addEventListener( "rise-presentation-play", () => this._reset());
    this.addEventListener( "rise-presentation-stop", () => this._stop());

    super.initCache({
      name: `${this.tagName.toLowerCase()}_v${version.charAt(0)}`,
      expiry: 1000 * 60 * 60 * 24 * 7
    });
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
        fileUrl = this._filesToRenderList[ this._transitionIndex ].fileUrl;

      super.log( RiseImage.LOG_TYPE_ERROR, "image-load-fail", null, {
        storage: super.getStorageData( filePath, fileUrl )
      });
      this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, { filePath, errorMessage: "image load failed" });
    });

    this.$.image.addEventListener( "loaded-changed", event => {
      if ( event.detail.value === true ) {
        super._setUptimeError( false );
      }
    });
  }

  _revokeObjectUrl() {
    if ( RisePlayerConfiguration.isPreview() && this.$.image.src ) {
      URL.revokeObjectURL( this.$.image.src );
    }
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

      super.log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_IMAGE_RESET, {
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

          super.log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_SVG_USAGE, { svg_details: {
            blob_size: xhr.response.size,
            data_url_length: reader.result.length
          } }, { storage: super.getStorageData( file, localUrl ) });

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

  _renderImageForPreview( fileUrl ) {
    /*
      Ensure to set 'omitCheckingCachedStatus' flag to true on getFile() call if running in Editor Preview to avoid unnecessary HEAD requests
      This is because we append 'time-created' value from metadata in the file url to ensure we get the latest version of file,
      as well as we check 'exists' in metadata to ensure to filter out a deleted file(s) upon start/reset
     */
    const omitCheckingCachedStatus = RisePlayerConfiguration.Helpers.isEditorPreview();

    super.getFile( fileUrl, omitCheckingCachedStatus )
      .then( objectUrl => {
        if ( typeof objectUrl === "string" ) {
          this._revokeObjectUrl();
          this.$.image.src = objectUrl;
        } else {
          throw new Error( "Invalid file url!" );
        }
      }).catch( error => {
        // TODO: handle error
        console.error( error );
      })
  }

  _renderImage( filePath, fileUrl ) {
    if ( this.responsive ) {
      this.$.image.updateStyles({ "--iron-image-width": "100%", "width": "100%", "height": "auto", "display": "inline-block" });
    } else {
      this.$.image.updateStyles({ "display": "inline-block" });
      this.$.image.width = isNaN( this.width ) ? parseInt( this.width, 10 ) : this.width;
      this.$.image.height = isNaN( this.height ) ? parseInt( this.height, 10 ) : this.height;
      this.$.image.sizing = this.sizing;
      this.$.image.position = this.position;
    }

    if ( RisePlayerConfiguration.isPreview() ) {
      return this._renderImageForPreview( fileUrl );
    }

    if ( super.getStorageFileFormat( filePath ) === "svg" ) {
      this._getDataUrlFromSVGLocalUrl( filePath, fileUrl )
        .then( dataUrl => {
          this.$.image.src = dataUrl;
        })
        .catch( error => {
          super.log( RiseImage.LOG_TYPE_ERROR, "image-svg-fail", error, {
            storage: super.getStorageData( filePath, fileUrl )
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

    let { validFiles } = super.validateFiles( filesList, VALID_FILE_TYPES );

    if ( RisePlayerConfiguration.isPreview() ) {
      validFiles = this._filterDeletedFilesForPreview( validFiles );
    }

    if ( !validFiles || !validFiles.length ) {
      this._validFiles = [];

      return this._startEmptyPlayUntilDoneTimer();
    } else {
      this._validFiles = validFiles;

      if ( RisePlayerConfiguration.isPreview()) {
        return this._handleStartForPreview();
      }

      if ( !RisePlayerConfiguration.LocalMessaging.isConnected()) {
        return this._startEmptyPlayUntilDoneTimer();
      }

      super.startWatch( validFiles );
    }
  }

  _stop() {
    this._revokeObjectUrl();

    this._validFiles = [];
    this._filesToRenderList = [];

    super.stopWatch();
    this._clearDisplayedImage();

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

  _filterDeletedFilesForPreview( files ) {
    if ( !files || !Array.isArray( files ) ) {
      return [];
    }

    return files.filter( file => this._previewStatusFor( file ) !== "deleted" );
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
      status: "current"
    }));
  }

  _handleStart() {
    if ( this._initialStart ) {
      this._initialStart = false;

      super.log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_START, {
        files: this.files, isLogo: this.isLogo, logoFile: this.logoFile
      });

      this._start();
    }
  }

  _getFileUrl( file ) {
    return RiseImage.STORAGE_PREFIX + this._encodePath( file ) + "?_=" + this._timeCreatedFor( file );
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
      this._startEmptyPlayUntilDoneTimer();
    }
  }

  watchedFileAddedCallback() {
    if ( RisePlayerConfiguration.isPreview() && this.managedFiles.length !== this._validFiles.length ) {
      // For preview we wait until watchFilesMixin is managing full list of valid files
      return;
    }

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
