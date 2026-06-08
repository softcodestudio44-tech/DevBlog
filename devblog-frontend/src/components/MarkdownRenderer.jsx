import React from 'react';

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  const parseMarkdown = (text) => {
    const lines = text.split('\n');

    return lines.map((line, index) => {
      // Handle headers
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold text-white mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-white mt-4 mb-2">{line.replace('# ', '')}</h1>;
      }

      // Handle bold text **text**
      const parts = [];
      const regex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      let keyIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(<span key={keyIndex++}>{line.slice(lastIndex, match.index)}</span>);
        }
        parts.push(<strong key={keyIndex++} className="font-bold text-white">{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) {
        parts.push(<span key={keyIndex++}>{line.slice(lastIndex)}</span>);
      }

      if (parts.length === 0) {
        parts.push(<span key={0}>{line}</span>);
      }

      // Handle numbered lists
      if (/^\d+\.\s/.test(line)) {
        return <p key={index} className="text-white/80 mb-1 ml-4">{parts}</p>;
      }

      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <p key={index} className="text-white/80 mb-1 ml-4">• {parts.slice(1)}</p>;
      }

      // Empty line
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }

      return <p key={index} className="text-white/80 mb-2 leading-relaxed">{parts}</p>;
    });
  };

  return (
    <div className="markdown-content">
      {parseMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;