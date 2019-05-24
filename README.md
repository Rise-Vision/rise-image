# Image Web Component [![CircleCI](https://circleci.com/gh/Rise-Vision/rise-image/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/rise-image/tree/master)

## Introduction

`rise-image` is a Polymer 3 Web Component that retrieves image files from Rise Local Storage, and displays them.

Instructions for demo page here:
https://github.com/Rise-Vision/rise-image/blob/master/demo/README.md

## Usage

The below illustrates simple usage of the component. 

There is no need to configure listeners if the component runs as editable ( default operation mode ). See the demo section in this repo for a full working example of an HTML page using the component which will illustrate required imports in the `<head>` of the page.

### Example

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

### Labels

The component may define a 'label' attribute that defines the text that will appear for this instance in the template editor.

This attribute holds a literal value, for example:

```
  <rise-image id="rise-image-sample"
    label="Sample"
    files="risemedialibrary-abc123/logo.png">
  </rise-image>
```

If it's not set, the label for the component defaults to "Image", which is applied via the   [generate_blueprint.js](https://github.com/Rise-Vision/html-template-library/blob/master/generate_blueprint.js) file for a HTML Template build/deployment.

### Attributes

This component receives the following list of attributes:

- **id**: ( string / required ): Unique HTML id with format 'rise-image-<NAME_OR_NUMBER>'.
- **label**: ( string ): An optional label key for the text that will appear in the template editor. See 'Labels' section above.
- **files** ( string / required ): List of image file paths separated by pipe symbol. A file path must be a valid GCS file path. A folder path will not be valid. Example GCS path: risemedialibrary-abc-123/images/test2.jpg
- **duration**: ( number ): The duration in seconds that each image shows for when multiple files are configured. Defaults to 10 seconds.
- **width**: ( number / required ): Sets the width of image(s). Required if not using _responsive_ attribute.
- **height**: ( number / required ): Sets the height of image(s). Required if not using _responsive_ attribute.
- **sizing**: ( string ): Determines how to fill the boundaries of the element. Valid values are "contain" and "cover". Defaults to "contain".
  - “contain” : full aspect ratio of the image is contained within the element and letterboxed
  - “cover” : image is cropped in order to fully cover the bounds of the element
- **responsive**: ( boolean / non-value attribute ): Applies responsive sizing to the image(s) which will respond to instance parent `<div>` container. When _responsive_ is used, the component will ignore any "width", "height", or "sizing" attribute values
- **non-editable**: ( empty / optional ): If present, it indicates this component is not available for customization in the template editor.




### Events

The component sends the following events:

- **_configured_**: The component has initialized what it requires to and is ready to handle a _start_ event.
- **_image-error_**: Thrown if an error during the processing of the files happen. The template does not need to handle this, as the component is already logging errors to BQ when running on a display. Provides an object with the following properties: file, errorMessage and errorDetail.

The component is listening for the following events:

- **_start_**: This event will initiate accessing the image. It can be dispatched on the component when _configured_ event has been fired as that event indicates the component has initialized what it requires to and is ready to make a request to the Financial server to retrieve data.

### Logs to BQ

The component may log the following:

- **_image-start_** ( info ): The component receives the _start_ event and commences execution.
- **_image-reset_** ( info ): The component observed changes to either _files_ or _duration_ attributes and performs a complete reset to use latest values.
- **_image-svg-usage_** ( info ): Provides an SVG file _blob size_ and _data url length_ info for investigative purposes.   
- **_image-load-fail_** ( error ): When attempting to render an available image, the image load failed. 
- **_image-format-invalid_** ( error ): A GCS path was set that targets a file with an invalid image file format. Valid image file formats are: jpg, jpeg, png, bmp, svg, gif, and webp.
- **_image-svg-fail_** ( error ): When component is targeting an SVG file, the component converts the local file URL to a data url to support running on Electron Player. This error event indicates the attempt to get data url or render the SVG file failed.
- **_image-rls-error_** ( error ): An error is received from Rise Local Storage for a file

In every case of an error, examine event-details entry and the other event fields for more information about the problem.

## Built With
- [Polymer 3](https://www.polymer-project.org/)
- [Polymer CLI](https://github.com/Polymer/tools/tree/master/packages/cli)
- [Polymer iron-image](https://github.com/PolymerElements/iron-image)
- [WebComponents Polyfill](https://www.webcomponents.org/polyfills/)
- [npm](https://www.npmjs.org)

## Development

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
