# Image Web Component [![CircleCI](https://circleci.com/gh/Rise-Vision/rise-image/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/rise-image/tree/master) [![Coverage Status](https://coveralls.io/repos/github/Rise-Vision/rise-image/badge.svg?branch=master)](https://coveralls.io/github/Rise-Vision/rise-image?branch=master)

## Introduction

`rise-image` is a Polymer 3 Web Component that retrieves image files from Rise Local Storage, and displays them.

## Usage for Designers
The below illustrates simple usage of the component. An example of a working image component in a Template can be found here: 
https://github.com/Rise-Vision/html-template-library/tree/master/example-pud-image

### Integration in a Template
#### HTML
Add a reference to the component in the `<head>` section of **template.html**.
```
<script src="https://widgets.risevision.com/stable/components/rise-image/1/rise-image.js"></script>
```

Add an instance of the component to `<body>` section of **template.html**.
```
  <body>
    <div id="image-sample-container">
      <rise-image
        id="rise-image-sample"
        files="risemedialibrary-abc123/file1.png|risemedialibrary-abc123/file2.png|risemedialibrary-abc123/file3.png"
        duration="5"
        responsive>
      </rise-image>
    </div>
...

  </body>
```

#### JS
To test the template in a browser outside Player/Apps, add the following lines (replacing with the appropriate element id to **main.js**. Note: Comment before committing.

```
function configureComponents {
const image = document.getElementById( "rise-image-01" );

//Uncomment when testing in browser
RisePlayerConfiguration.Helpers.sendStartEvent( image );
}

window.addEventListener( "rise-components-ready", configureComponents );
```
#### JSON
For npm to install dependencies neccesssary add refrences to component repo in **package.json**.
```
"dependencies": {
    "rise-image": "git://github.com/Rise-Vision/rise-image.git",
    "@webcomponents/webcomponentsjs": "^2.1.1"
    ...
  },
```

#### Build and Test Locally in Browswer 
Execute the following commands in Terminal and preview template.html in browser using a simple server.  example: http://localhost:8081/build/prod/src/template.html:

```
npm install
npm install -g polymer-cli@1.9.7
npm run build
python -m SimpleHTTPServer 8081
```
For more specifics please see: HTML Template - Build and Test Locally in Browser Documentation. 
https://docs.google.com/document/d/1_xgKe790ZuweDVg-Abj3032an6we7YLH_lQPpe-M88M/edit#bookmark=id.21c68d5f8a7c


### Label & Help Text

The component may define a 'label' attribute that defines the text that will appear for this instance in the template editor.

It may also define a 'help-text' attribute that will be presented as a help message for the users. Ideally, it should be used to provide the recommended image size.

These attributes hold a literal value, for example:

```
  <rise-image id="rise-image-sample"
    label="Sample"
    help-text="Recommended image size is 1920x1080 pixels."
    files="risemedialibrary-abc123/logo.png">
  </rise-image>
```

If it's not set, the 'label' for the component defaults to "Image", which is applied via the   [generate_blueprint.js](https://github.com/Rise-Vision/html-template-library/blob/master/generate_blueprint.js) file for a HTML Template build/deployment.

If 'help-text' is not defined, no help message will be displayed for this component instance in the template editor.

### Attributes

This component receives the following list of attributes:

- **id**: ( string / required ): Unique HTML id with format 'rise-image-<NAME_OR_NUMBER>'.
- **label**: ( string ): An optional label key for the text that will appear in the template editor. See 'Labels' section above.
- **files** ( string / required ): List of image file paths separated by pipe symbol. A file path must be a valid GCS file path. A folder path will not be valid. For example, this is a default folder path from Rise Storage:
https://storage.googleapis.com/risemedialibrary-7fa5ee92-7deb-450b-a8d5-e5ed648c575f/Template%20Library/Global%20Assets/logo-white.png.
To create a valid GCS path, remove *https://storage.googleapis.com/* and replace *%20* with a space.
The resulting GCS path is: risemedialibrary-7fa5ee92-7deb-450b-a8d5-e5ed648c575f/Template Library/Global Assets/logo-white.png.
- **duration**: ( number ): The duration in seconds that each image shows for when multiple files are configured. Defaults to 10 seconds.
- **width**: ( number / required ): Sets the width of image(s). Required if not using _responsive_ attribute.
- **height**: ( number / required ): Sets the height of image(s). Required if not using _responsive_ attribute.
- **sizing**: ( string ): Determines how to fill the boundaries of the element. Valid values are "contain" and "cover". Defaults to "contain".
  - “contain” : full aspect ratio of the image is contained within the element and letterboxed
  - “cover” : image is cropped in order to fully cover the bounds of the element
- **position**: ( string ): Determines how the image is aligned within the element bounds when _sizing_ is applied. Valid values correspond to the CSS background-position property. Defaults to "center".
- **responsive**: ( boolean / non-value attribute ): Applies responsive sizing to the image(s) which will respond to instance parent `<div>` container. When _responsive_ is used, the component will ignore any "width", "height", "sizing", or "position" attribute values
- **non-editable**: ( empty / optional ): If present, it indicates this component is not available for customization in the template editor.
- **play-until-done**: ( empty / optional ): If present, it indicates this component will send the `"report-done"` event when if finishes showing the images.
- **is-logo**: ( boolean / optional ): If ``"true"``, it indicates this component will display the Company Logo defined in the Branding settings.

### Events

The component sends the following events:

- **_configured_**: The component has initialized what it requires to and is ready to handle a _start_ event.
- **_image-error_**: Thrown if an error during the processing of the files happen. The template does not need to handle this, as the component is already logging errors to BQ when running on a display. Provides an object with the following properties: file, errorMessage and errorDetail.

The component is listening for the following events:

- **_start_**: This event will initiate accessing the image. It can be dispatched on the component when _configured_ event has been fired as that event indicates the component has initialized what it requires to and is ready to make a request to the Financial server to retrieve data.

### Play Until Done

When configured with the `play-until-done` attribute the component checks if it is done on every image transition and sends the `"report-done"` event to the template.

If there is a single image configured in `files` or no image at all the event is sent after the time configured in the `duration` attribute or 10 seconds if no duration is set. 

## Development
Instructions for demo page here:
https://github.com/Rise-Vision/rise-image/blob/master/demo/README.md

### Built With
- [Polymer 3](https://www.polymer-project.org/)
- [Polymer CLI](https://github.com/Polymer/tools/tree/master/packages/cli)
- [Polymer iron-image](https://github.com/PolymerElements/iron-image)
- [WebComponents Polyfill](https://www.webcomponents.org/polyfills/)
- [npm](https://www.npmjs.org)

### Local Development Build
Clone this repo and change into this project directory.

Execute the following commands in Terminal:

```
npm install
npm install -g polymer-cli@1.9.7
npm run build
```

**Note**: If EPERM errors occur then install polymer-cli using the `--unsafe-perm` flag ( `npm install -g polymer-cli@1.9.7 --unsafe-perm` ) and/or using sudo.

### Testing
You can run the suite of tests either by command terminal or interactive via Chrome browser.

#### Command Terminal
Execute the following command in Terminal to run tests:

```
npm run test
```

In case `polymer-cli` was installed globally, the `wct-istanbul` package will also need to be installed globally:

```
npm install -g wct-istanbul
```

#### Local Server
Run the following command in Terminal: `polymer serve`.

Now in your browser, navigate to:

```
http://127.0.0.1:8081/components/rise-image/test/index.html
```
You can also run a specific test page by targeting the page directly, for example:

```
http://127.0.0.1:8081/components/rise-image/test/unit/rise-image.html
```

### Logs to BQ

The component may log the following:

- **_image-start_** ( info ): The component receives the _start_ event and commences execution.
- **_image-reset_** ( info ): The component observed changes to either _files_ or _duration_ attributes and performs a complete reset to use latest values.
- **_image-svg-usage_** ( info ): Provides an SVG file _blob size_ and _data url length_ info for investigative purposes.
- **_image-load-fail_** ( error ): When attempting to render an available image, the image load failed.
- **_image-svg-fail_** ( error ): When component is targeting an SVG file, the component converts the local file URL to a data url to support running on Electron Player. This error event indicates the attempt to get data url or render the SVG file failed.

Additionally, because the component inherits from [WatchFilesMixin](https://github.com/Rise-Vision/rise-common-component/blob/master/src/watch-files-mixin.js) and [ValidFilesMixin](https://github.com/Rise-Vision/rise-common-component/blob/master/src/valid-files-mixin.js) in [rise-common-component](https://github.com/Rise-Vision/rise-common-component), it may log the following:

- **_file-not-found_** (error): A watched file is not found.
- **_file-insufficient-disk-space-error_** (error): A watched file can not be downloaded due to a lack of disk space.
- **_file-rls-error_** (error): A general RLS error is encountered for a watched file.
- **_format-invalid_** (error): A file with an invalid extension is encountered.
- **_all-formats-invalid_** (error): All files have invalid formats.

In every case of an error, examine event-details entry and the other event fields for more information about the problem.

## Submitting Issues
If you encounter problems or find defects we really want to hear about them. If you could take the time to add them as issues to this Repository it would be most appreciated. When reporting issues, please use the following format where applicable:

**Reproduction Steps**

1. did this
2. then that
3. followed by this (screenshots / video captures always help)

**Expected Results**

What you expected to happen.

**Actual Results**

What actually happened. (screenshots / video captures always help)

## Contributing
All contributions are greatly appreciated and welcome! If you would first like to sound out your contribution ideas, please post your thoughts to our [community](https://help.risevision.com/hc/en-us/community/topics), otherwise submit a pull request and we will do our best to incorporate it. Please be sure to submit test cases with your code changes where appropriate.

## Resources
If you have any questions or problems, please don't hesitate to join our lively and responsive [community](https://help.risevision.com/hc/en-us/community/topics).

If you are looking for help with Rise Vision, please see [Help Center](https://help.risevision.com/hc/en-us).

**Facilitator**

[Stuart Lees](https://github.com/stulees "Stuart Lees")
