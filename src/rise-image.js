/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { version } from "./rise-image-version.js";
import "@polymer/iron-image/iron-image.js";

class RiseImage extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: inline-block;
          overflow: hidden;
          position: relative;
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
      responsive: {
        type: Boolean,
        value: false
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
      "_reset(files, duration)"
    ]
  }

  static get EVENT_CONFIGURED() {
    return "configured";
  }

  static get EVENT_START() {
    return "start";
  }

  static get EVENT_IMAGE_STATUS_UPDATED() {
    return "image-status-updated";
  }

  static get EVENT_IMAGE_ERROR() {
    return "image-error";
  }

  static get EVENT_IMAGE_RESET() {
    return "image-reset";
  }

  static get EVENT_SVG_USAGE() {
    return "svg-usage";
  }

  static get LOG_TYPE_INFO() {
    return "info";
  }

  static get LOG_TYPE_WARNING() {
    return "warning";
  }

  static get LOG_TYPE_ERROR() {
    return "error";
  }

  static get STORAGE_PREFIX() {
    return "https://storage.googleapis.com/";
  }

  constructor() {
    super();

    this._watchInitiated = false;
    this._initialStart = true;
    this._filesList = [];
    this._managedFiles = [];
    this._managedFilesInError = [];
    this._filesToRenderList = [];
    this._transitionIndex = 0;
    this._transitionTimer = null;
  }

  ready() {
    super.ready();

    this._configureImageEventListeners();

    const handleStart = () => this._handleStart();

    this.addEventListener( RiseImage.EVENT_START, handleStart, {
      once: true
    });

    this._sendImageEvent( RiseImage.EVENT_CONFIGURED );
  }

  _configureImageEventListeners() {
    this.$.image.addEventListener( "error-changed", ( evt ) => {
      console.log( evt );
    });
  }

  _getComponentData() {
    return {
      name: "rise-image",
      id: this.id,
      version: version
    };
  }

  _getStorageData( file, url ) {
    return {
      configuration: "storage file",
      file_form: this._getStorageFileFormat( file ),
      file_path: file,
      local_url: url || ""
    }
  }

  _getStorageFileFormat( filePath ) {
    if ( !filePath || typeof filePath !== "string" ) {
      return "";
    }

    return filePath.substr( filePath.lastIndexOf( "." ) + 1 ).toLowerCase();
  }

  _getManagedFileInError( filePath ) {
    return this._managedFilesInError.find( file => file.filePath === filePath );
  }

  _getManagedFile( filePath ) {
    return this._managedFiles.find( file => file.filePath === filePath );
  }

  _getFileToRender( filePath ) {
    return this._filesToRenderList.find( file => file.filePath === filePath );
  }

  _reset() {
    if ( !this._initialStart ) {

      timeOut.cancel( this._transitionTimer );
      this._clearDisplayedImage();

      this._watchInitiated = false;
      this._filesList = [];
      this._managedFiles = [];
      this._managedFilesInError = [];
      this._filesToRenderList = [];
      this._transitionTimer = null;
      this._transitionIndex = 0;

      this._log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_IMAGE_RESET, { files: this.files });
      this._start();
    }
  }

  _isValidFileType( path ) {
    const format = this._getStorageFileFormat( path ),
      valid = [ "jpg", "jpeg", "png", "bmp", "svg", "gif", "webp" ];


    for ( let i = 0, len = valid.length; i < len; i++ ) {
      if ( format.indexOf( valid[ i ]) !== -1 ) {
        return true;
      }
    }

    return false;
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

          this._log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_SVG_USAGE, { svg_details: {
            blob_size: xhr.response.size,
            data_url_length: reader.result.length
          } }, { storage: this._getStorageData( file, localUrl ) });

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

  _isValidFiles( files ) {
    if ( !files || typeof files !== "string" ) {
      return false;
    }

    // single symbol
    if ( files.indexOf( "|" ) === -1 ) {
      return true;
    }

    return files.split( "|" ).indexOf( "" ) === -1;
  }

  _filterInvalidFileTypes( files ) {
    let invalidFiles = [];
    const filteredFiles = files.filter( file => {
      const valid = this._isValidFileType( file );

      if ( !valid ) {
        invalidFiles.push( file );
      }

      return valid;
    });

    invalidFiles.forEach( invalidFile => {
      this._log( RiseImage.LOG_TYPE_ERROR, RiseImage.EVENT_IMAGE_ERROR, { errorMessage: "Invalid file format" }, { storage: this._getStorageData( invalidFile ) });
    });

    if ( !filteredFiles || filteredFiles.length === 0 ) {
      this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, { files, errorMessage: "All file formats are invalid" });
    }

    return filteredFiles;
  }

  _renderImage( filePath, fileUrl ) {
    if ( this.responsive ) {
      this.$.image.updateStyles({ "--iron-image-width": "100%" });
    } else {
      this.$.image.width = isNaN( this.width ) ? parseInt( this.width, 10 ) : this.width;
      this.$.image.height = isNaN( this.height ) ? parseInt( this.height, 10 ) : this.height;
      this.$.image.sizing = this.sizing;
    }

    if ( this._getStorageFileFormat( filePath ) === "svg" ) {
      this._getDataUrlFromSVGLocalUrl( filePath, fileUrl )
        .then( dataUrl => {
          this.$.image.src = dataUrl;
        })
        .catch( error => {
          this._log( RiseImage.LOG_TYPE_ERROR, RiseImage.EVENT_IMAGE_ERROR, error, { storage: this._getStorageData( filePath, fileUrl ) });
          this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, { filePath, errorMessage: error });
        });
    } else {
      this.$.image.src = fileUrl;
    }
  }

  _clearDisplayedImage() {
    this.$.image.src = "";
  }

  _onShowImageComplete() {
    if ( this._transitionIndex < ( this._filesToRenderList.length - 1 )) {
      this._transitionIndex += 1;
      this._renderImage( this._filesToRenderList[ this._transitionIndex ].filePath, this._filesToRenderList[ this._transitionIndex ].fileUrl );
      this._startTransitionTimer();
    } else {
      this._configureShowingImages();
    }
  }

  _startTransitionTimer() {
    this.duration = parseInt( this.duration, 10 );

    if ( !isNaN( this.duration ) && this.duration !== 0 ) {
      this._transitionTimer = timeOut.run( this._onShowImageComplete.bind( this ), this.duration * 1000 );
    }
  }

  _configureShowingImages() {
    this._filesToRenderList = this._managedFiles.slice( 0 );
    this._transitionIndex = 0;

    if ( this._filesToRenderList.length > 0 ) {
      this._renderImage( this._filesToRenderList[ 0 ].filePath, this._filesToRenderList[ 0 ].fileUrl );

      if ( this._filesToRenderList.length > 1 ) {
        this._startTransitionTimer();
      }
    } else {
      this._clearDisplayedImage();
    }
  }

  _manageFileInError( details, fixed ) {
    const { filePath, params } = details;

    if ( !filePath ) {
      return;
    }

    let fileInError = this._getManagedFileInError( filePath );

    if ( fixed && fileInError ) {
      // remove this file from files in error list
      this._managedFilesInError.splice( this._managedFilesInError.findIndex( file => file.filePath === filePath ), 1 );
    } else if ( !fixed ) {
      if ( !fileInError ) {
        fileInError = { filePath, params };
        // add this file to list of files in error
        this._managedFilesInError.push( fileInError );
      } else {
        fileInError.params = params;
      }
    }
  }

  _manageFile( message ) {
    const { filePath, status, fileUrl } = message;

    let managedFile = this._getManagedFile( filePath );

    if ( status.toUpperCase() === "CURRENT" ) {
      if ( !managedFile ) {
        // get the order that this file should be in from _filesList
        const order = this._filesList.findIndex( path => path === filePath );

        managedFile = { filePath, fileUrl, order };

        // add this file to list
        this._managedFiles.push( managedFile );
      } else {
        // file has been updated
        managedFile.fileUrl = fileUrl;
      }
    }

    if ( status.toUpperCase() === "DELETED" && managedFile ) {
      this._managedFiles.splice( this._managedFiles.findIndex( file => file.filePath === filePath ), 1 );
    }

    // sort the managed files based on order value
    this._managedFiles.sort(( a, b ) => a.order - b.order );
  }

  _start() {
    if ( !this._isValidFiles( this.files )) {
      return;
    }

    this._filesList = this._filterInvalidFileTypes( this.files.split( "|" ));

    if ( !this._filesList || !this._filesList.length || this._filesList.length === 0 ) {
      return;
    }

    if ( RisePlayerConfiguration.isPreview()) {
      return this._handleStartForPreview();
    }

    if ( !this._watchInitiated ) {
      this._filesList.forEach( file => {
        RisePlayerConfiguration.LocalStorage.watchSingleFile(
          file, message => this._handleSingleFileUpdate( message )
        );
      });

      this._watchInitiated = true;
    }
  }

  _handleStartForPreview() {
    // check license for preview will be implemented in some other epic later
    this._filesList.forEach( file => this._handleImageStatusUpdated({
      filePath: file,
      fileUrl: RiseImage.STORAGE_PREFIX + file,
      status: "current"
    }));
  }

  _handleStart() {
    if ( this._initialStart ) {
      this._initialStart = false;

      this._log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_START, { files: this.files });

      this._start();
    }
  }

  _log( type, event, details = null, additionalFields ) {
    if ( RisePlayerConfiguration.isPreview()) {
      return;
    }

    const componentData = this._getComponentData();

    switch ( type ) {
    case RiseImage.LOG_TYPE_INFO:
      RisePlayerConfiguration.Logger.info( componentData, event, details, additionalFields );
      break;
    case RiseImage.LOG_TYPE_WARNING:
      RisePlayerConfiguration.Logger.warning( componentData, event, details, additionalFields );
      break;
    case RiseImage.LOG_TYPE_ERROR:
      RisePlayerConfiguration.Logger.error( componentData, event, details, additionalFields );
      break;
    }
  }

  _handleSingleFileError( message ) {
    const { filePath, fileUrl } = message,
      details = { filePath, errorMessage: message.errorMessage, errorDetail: message.errorDetail },
      fileInError = this._getManagedFileInError( filePath );

    // prevent repetitive logging when component instance is receiving messages from other potential component instances watching same file
    if ( fileInError && ( JSON.stringify( details ) === JSON.stringify( fileInError.details ))) {
      return;
    }

    this._manageFileInError( details, false );

    /*** Possible error messages from Local Storage ***/
    /*
      "File's host server could not be reached"

      "File I/O Error"

      "Could not retrieve signed URL"

      "Insufficient disk space"

      "Invalid response with status code [CODE]"
     */

    this._log( RiseImage.LOG_TYPE_ERROR, RiseImage.EVENT_IMAGE_ERROR, {
      errorMessage: message.errorMessage,
      errorDetail: message.errorDetail
    }, { storage: this._getStorageData( filePath, fileUrl ) });

    this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, details );


    if ( this._getManagedFile( filePath )) {
      // remove this file from the file list since there was a problem with its new version being provided
      this._manageFile({ filePath, status: "deleted" });

      if ( this._filesToRenderList.length === 1 && this._getFileToRender( message.filePath )) {
        this._filesToRenderList = [];
        this._clearDisplayedImage();
      }
    }
  }

  _handleSingleFileUpdate( message ) {
    if ( !message.status || !message.filePath ) {
      return;
    }

    if ( message.status.toUpperCase() === "FILE-ERROR" ) {
      this._handleSingleFileError( message );
      return;
    }

    this._handleImageStatusUpdated( message );
  }

  _handleImageStatusUpdated( message ) {
    const { filePath, status, fileUrl } = message;

    this._log( RiseImage.LOG_TYPE_INFO, RiseImage.EVENT_IMAGE_STATUS_UPDATED, { status }, { storage: this._getStorageData( filePath, fileUrl ) });

    this._manageFile( message );
    this._manageFileInError( message, true );

    if ( this._filesToRenderList.length === 1 && status.toUpperCase() === "DELETED" && this._filesToRenderList.find( file => file.filePath === filePath )) {
      this._filesToRenderList = [];
      this._clearDisplayedImage();

      return;
    }

    if ( this._filesToRenderList.length < 2 && status.toUpperCase() === "CURRENT" ) {
      this._configureShowingImages();
    }
  }

  _sendImageEvent( eventName, detail = {}) {
    const event = new CustomEvent( eventName, {
      bubbles: true, composed: true, detail
    });

    this.dispatchEvent( event );
  }

}

customElements.define( "rise-image", RiseImage );
