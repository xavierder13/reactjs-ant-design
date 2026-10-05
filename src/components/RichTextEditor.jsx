import { useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic, Strikethrough, RemoveFormat,
  List, Indent, BlockQuote, Link, Table, TableToolbar, HorizontalLine, PasteFromOffice,
  SpecialCharacters, SpecialCharactersEssentials,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import './RichTextEditor.css';
import { toCkeditor4Html } from './ckeditor4Html';

// CKEditor 5 set up to match the careers portal's CKEditor 4 (4.17.2
// standard-all, default config — CKEditor 4 is end-of-life): the same
// features and toolbar order, nothing CKEditor 4 would strip (it drops
// underline, sub/superscript, alignment, paragraph indent and H4–H6), and
// output rewritten into CKEditor 4's exact HTML by toCkeditor4Html.
// Self-hosted under the GPL licence key.
//
// A Form.Item control: `value` / `onChange` carry the HTML string. onChange
// only fires for the user's own edits (editor focused), so a field that is
// opened but not edited keeps its stored HTML byte-for-byte — CKEditor 5
// would otherwise re-serialise it on load.
const CONFIG = {
  licenseKey: 'GPL',
  plugins: [
    Essentials, Paragraph, Heading, Bold, Italic, Strikethrough, RemoveFormat, List, Indent,
    BlockQuote, Link, Table, TableToolbar, HorizontalLine, PasteFromOffice,
    SpecialCharacters, SpecialCharactersEssentials,
  ],
  // CKEditor 4 standard toolbar order (minus Image, Anchor, Styles, Source,
  // Maximize and spell check, which this app doesn't offer).
  toolbar: {
    items: [
      'undo', 'redo', '|', 'link', '|', 'insertTable', 'horizontalLine', 'specialCharacters', '|',
      'bold', 'italic', 'strikethrough', 'removeFormat', '|',
      'numberedList', 'bulletedList', 'outdent', 'indent', 'blockQuote', '|', 'heading',
    ],
    shouldNotGroupWhenFull: false,
  },
  // CKEditor 4 format_tags in the standard config: p;h1;h2;h3;pre.
  heading: {
    options: [
      { model: 'paragraph', title: 'Normal', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
    ],
  },
  table: { contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'] },
  link: { defaultProtocol: 'https://' },
};

const RichTextEditor = ({ value, onChange, disabled }) => {
  // The editor is fed raw CKEditor 5 HTML; the form holds the CKEditor 4
  // version. A new `value` from outside (form reset / fill) replaces the
  // editor content; our own emitted value doesn't (it would reset the caret).
  const [editorData, setEditorData] = useState(value || '');
  const [emitted, setEmitted] = useState(null);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== emitted) setEditorData(value || '');
  }

  const handleChange = (_, editor) => {
    if (!editor.ui.focusTracker.isFocused) return;
    const html = editor.getData();
    const output = toCkeditor4Html(html);
    setEditorData(html);
    setEmitted(output);
    onChange?.(output);
  };

  return (
    <CKEditor
      editor={ClassicEditor}
      config={CONFIG}
      data={editorData}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};

export default RichTextEditor;
