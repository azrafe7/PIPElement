# PIPElement
View highligthed elements (or page) Picture-In-Picture.

[![PIPElement](./webstore_assets/screenshot_01.png)](./webstore_assets/screenshot_01.png)

You can find it here: https://chrome.google.com/webstore/detail/...

# Overview
View any element (or the whole page) Picture-In-Picture.
Not only videos or images, it works on any element.

Hold SHIFT to add the highligthed element to the PIP Window, or press ESC (or right-click) to quit the picker.
Use Q/A keys to expand/reduce the highligthed selection, then press SPACE to add it to the PIP Window.

You can also use Alt+P to activate the picker (or configure an alternate shortcut key in the extension settings).

**NOTE**: Although the extension tries to keep the elements stylized as in the original page, 
the underlying technology ([DocumentPictureInPicture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)) cannot ensure the same styles are applied consistently
(either because the DOM layout is different in the PIP Window vs the original page, so CSS doesn't work in the intended way, or JS is used to style the page).

Also note that DocumentPictureInPicture doesn't allow navigation, so clicking on links in the PIP Window will close it and restore elements to the original page.

For more info about the DocumentPictureInPicture API see also here: https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API


CHANGELOG: https://github.com/azrafe7/PIPElement/blob/main/CHANGELOG.md
