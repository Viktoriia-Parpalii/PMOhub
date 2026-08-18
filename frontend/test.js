const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = `<html><body><div id="root"><div><main><div><div><div>
  <div>Header</div>
  <div>Tabs</div>
  <div>Table/Grid Container
    <div>overflow-x-auto
      <div>table
        <div>thead</div>
        <button></button><button></button><button>TARGET</button>
      </div>
    </div>
  </div>
</div></div></div></main></div></div></body></html>`;
// ... wait, this is hard without the real DOM.
