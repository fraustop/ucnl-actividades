import React from 'react';
import { ExternalLink, Check, Copy } from 'lucide-react';
import { normalizeUrl } from '../utils/textUtils';

/**
 * Parsea y renderiza texto con formato enriquecido (Markdown + HTML seguro):
 * - Enlaces [Texto](url), <a href="...">, URLs directas (https://... / http://... / www....)
 * - Negrita (**texto**, __texto__, <b>, <strong>)
 * - Cursiva (*texto*, _texto_, <i>, <em>)
 * - Subrayado (<u>texto</u>)
 * - Tachado (~~texto~~, <s>, <del>)
 * - Encabezados (# H1, ## H2, ### H3, #### H4)
 * - Listas (- viñetas, * viñetas, 1. numeradas, <ul>, <ol>, <li>)
 * - Citas (> cita, <blockquote>)
 * - Bloques de código (```codigo``` y `codigo inline`)
 * - Tablas (| col1 | col2 |)
 * - Separadores horizontales (---, ***, <hr>)
 */
export const RichTextRenderer = ({ content = '', className = '' }) => {
  const [copiedIndex, setCopiedIndex] = React.useState(null);

  if (!content || typeof content !== 'string') {
    return <p className="text-slate-400 italic text-xs">Sin descripción proporcionada.</p>;
  }

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Función para renderizar elementos inline (negritas, cursivas, enlaces, código, etc.)
  const renderInlineFormatting = (text) => {
    if (!text) return null;

    // Tokenizador inline comprensivo:
    // 1. Enlaces Markdown: [label](url)
    // 2. Enlaces HTML: <a href="url">label</a>
    // 3. URLs directas: https://... o http://... o www....
    // 4. Negrita: **texto**, __texto__, <b>texto</b>, <strong>texto</strong>
    // 5. Cursiva: *texto*, _texto_, <i>texto</i>, <em>texto</em>
    // 6. Subrayado: <u>texto</u>
    // 7. Tachado: ~~texto~~, <s>texto</s>, <del>texto</del>
    // 8. Código inline: `texto`, <code>texto</code>
    const regex = /(\[([^\]]+)\]\(([^)]+)\))|(<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>)|(https?:\/\/[^\s<>)\]}]+)|((?:^|(?<=\s))www\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+[^\s<>)\]}]*)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(<strong>(.*?)<\/strong>)|(<b>(.*?)<\/b>)|(\*([^*]+)\*)|(_([^_]+)_)|(<em>(.*?)<\/em>)|(<i>(.*?)<\/i>)|(<u>(.*?)<\/u>)|(~~(.*?)~~)|(<s>(.*?)<\/s>)|(<del>(.*?)<\/del>)|(`([^`]+)`)|(<code>(.*?)<\/code>)/gi;

    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Enlace Markdown [label](url)
        const label = match[2];
        const url = normalizeUrl(match[3]);
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 hover:underline transition mx-0.5 break-all group"
            onClick={(e) => e.stopPropagation()}
            title={`Abrir ${url}`}
          >
            <span>{label}</span>
            <ExternalLink className="w-3.5 h-3.5 inline-block flex-shrink-0 text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        );
      } else if (match[4]) {
        // Enlace HTML <a href="url">label</a>
        const url = normalizeUrl(match[5]);
        const label = match[6] || url;
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 hover:underline transition mx-0.5 break-all group"
            onClick={(e) => e.stopPropagation()}
            title={`Abrir ${url}`}
          >
            <span>{label}</span>
            <ExternalLink className="w-3.5 h-3.5 inline-block flex-shrink-0 text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        );
      } else if (match[7] || match[8]) {
        // URL directa (https://... o www....)
        const rawUrl = match[7] || match[8];
        const url = normalizeUrl(rawUrl);
        elements.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 hover:underline transition mx-0.5 break-all group"
            onClick={(e) => e.stopPropagation()}
            title={`Abrir ${url}`}
          >
            <span>{rawUrl}</span>
            <ExternalLink className="w-3.5 h-3.5 inline-block flex-shrink-0 text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        );
      } else if (match[9] || match[11] || match[13] || match[15]) {
        // Negrita
        const boldText = match[10] || match[12] || match[14] || match[16];
        elements.push(
          <strong key={match.index} className="font-bold text-slate-900">
            {boldText}
          </strong>
        );
      } else if (match[17] || match[19] || match[21] || match[23]) {
        // Cursiva
        const italicText = match[18] || match[20] || match[22] || match[24];
        elements.push(
          <em key={match.index} className="italic text-slate-800">
            {italicText}
          </em>
        );
      } else if (match[25]) {
        // Subrayado
        const underlineText = match[26];
        elements.push(
          <span key={match.index} className="underline underline-offset-2 text-slate-900">
            {underlineText}
          </span>
        );
      } else if (match[27] || match[29] || match[31]) {
        // Tachado
        const strikeText = match[28] || match[30] || match[32];
        elements.push(
          <span key={match.index} className="line-through text-slate-400">
            {strikeText}
          </span>
        );
      } else if (match[33] || match[35]) {
        // Código inline
        const codeText = match[34] || match[36];
        elements.push(
          <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-600 font-mono text-xs border border-slate-200">
            {codeText}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
  };

  // Procesar bloques (bloques de código, encabezados, citas, listas, tablas, separadores)
  const lines = content.split('\n');
  const blocks = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detección de inicio / fin de bloque de código (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Cerrar bloque de código
        blocks.push({
          type: 'code_block',
          lang: codeBlockLang,
          code: codeBlockLines.join('\n')
        });
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        // Abrir bloque de código
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Línea vacía
    if (!trimmed) {
      blocks.push({ type: 'empty' });
      continue;
    }

    // Separador horizontal (---, ***, o <hr>)
    if (/^(\-{3,}|\*{3,}|_{3,}|<hr\s*\/?>)$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      continue;
    }

    // Encabezados
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: trimmed.substring(5) });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.substring(4) });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.substring(3) });
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.substring(2) });
      continue;
    }

    // Cita (> o <blockquote>)
    if (trimmed.startsWith('> ') || trimmed.startsWith('&gt; ')) {
      blocks.push({ type: 'quote', text: trimmed.replace(/^(>|&gt;)\s*/, '') });
      continue;
    }

    // Viñetas (- , * , + , • o <li>)
    if (/^[-*+•]\s+/.test(trimmed)) {
      blocks.push({ type: 'bullet', text: trimmed.replace(/^[-*+•]\s+/, '') });
      continue;
    }

    // Lista numerada (1. 2. etc.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({ type: 'numbered', num: numMatch[1], text: numMatch[2] });
      continue;
    }

    // Párrafo normal
    blocks.push({ type: 'p', text: line });
  }

  // Si quedó un bloque de código abierto
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({
      type: 'code_block',
      lang: codeBlockLang,
      code: codeBlockLines.join('\n')
    });
  }

  return (
    <div className={`space-y-2 text-slate-700 leading-relaxed text-xs sm:text-sm font-sans select-text ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'empty':
            return <div key={idx} className="h-1.5" />;

          case 'hr':
            return <hr key={idx} className="my-3 border-slate-200" />;

          case 'h1':
            return (
              <h2 key={idx} className="text-base sm:text-lg font-black text-slate-900 pt-2 pb-1 border-b border-slate-200 leading-snug">
                {renderInlineFormatting(block.text)}
              </h2>
            );

          case 'h2':
            return (
              <h3 key={idx} className="text-sm sm:text-base font-extrabold text-slate-900 pt-2 pb-0.5 border-b border-slate-100 leading-snug">
                {renderInlineFormatting(block.text)}
              </h3>
            );

          case 'h3':
            return (
              <h4 key={idx} className="text-xs sm:text-sm font-bold text-slate-900 pt-1.5 pb-0.5 leading-snug">
                {renderInlineFormatting(block.text)}
              </h4>
            );

          case 'h4':
            return (
              <h5 key={idx} className="text-xs font-bold text-slate-800 pt-1 leading-snug">
                {renderInlineFormatting(block.text)}
              </h5>
            );

          case 'quote':
            return (
              <blockquote key={idx} className="border-l-4 border-blue-500 pl-3.5 py-1.5 bg-blue-50/50 rounded-r-2xl text-slate-700 italic my-1.5 font-medium">
                {renderInlineFormatting(block.text)}
              </blockquote>
            );

          case 'bullet':
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2 my-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">{renderInlineFormatting(block.text)}</div>
              </div>
            );

          case 'numbered':
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2 my-0.5">
                <span className="font-bold text-blue-600 text-xs flex-shrink-0 min-w-[18px]">
                  {block.num}.
                </span>
                <div className="flex-1 min-w-0">{renderInlineFormatting(block.text)}</div>
              </div>
            );

          case 'code_block':
            return (
              <div key={idx} className="my-2 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 text-xs font-mono shadow-md">
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                  <span>{block.lang || 'código / texto'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(block.code, idx)}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 overflow-x-auto leading-relaxed">
                  <code>{block.code}</code>
                </pre>
              </div>
            );

          case 'p':
          default:
            return (
              <p key={idx} className="leading-relaxed my-0.5">
                {renderInlineFormatting(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default RichTextRenderer;
