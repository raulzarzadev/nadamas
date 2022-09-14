import { draftToMarkdown } from "markdown-draft-js";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import PreviewImage from "../../PreviewImage";
import TurndownService from "turndown";

const MarkdownEntry = ({ content = "" }) => {
  const turndownService = new TurndownService();
  const [markdown, setMarkdown] = useState();
  useEffect(() => {
    /**
     *  * if blog entry is from the old text editor version  draftjs
     */
    if (window && content?.blocks) {
      const markdownString = draftToMarkdown(content, {
        escapeMarkdownCharacters: true,
        entityItems: {
          IMAGE: {
            open: function (entity, block) {
              return ``;
            },
            close: function (entity) {
              return `![alt text](${entity.data.src}) `;
            },
          },
        },
      });
      setMarkdown(markdownString);
    } else {
      /**
       *  * if blog entry is an html entry from the quill
       */
      const mark = turndownService.turndown(content);
      setMarkdown(mark);
    }
  }, []);

  const components = {
    //This custom renderer changes how images are rendered
    //we use it to constrain the max width of an image to its container,
    // change p for divs to avoid console errors aboaut header as desendent of p
    p: ({ ...props }) => <div {...props} />,
    img: ({ alt, src, title }) => (
      <PreviewImage image={src} modalImageSize="full" />
    ),
  };

  return (
    <article className="prose lg:prose-xl w-full ">
      <div
        className="w-full"
        // className='[&>p>img]:w-1/2 [&>p>img]:mx-auto   '
        // dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
      >
        <ReactMarkdown
          children={markdown}
          className={""}
          components={components}
        />
      </div>
    </article>
  );
};

export default MarkdownEntry;
