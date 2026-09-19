import React, { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline,
  Strikethrough,
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Quote, 
  Code, 
  Terminal,
  Minus,
  Eye, 
  Edit3,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';
import RichTextRenderer from './RichTextRenderer';
import { htmlToMarkdown, normalizeUrl } from '../utils/textUtils';

export const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Pega o escribe las instrucciones detalladas, rúbrica, enlaces web, listas...',
  rows = 6
}) => {
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
  const [pasteNotice, setPasteNotice] = useState(false);
  const textareaRef = useRef(null);

  // Inserción de formato Markdown alrededor o en el cursor
  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 40);
  };

  // Diálogo para insertar enlace web
  const handleInsertLink = () => {
    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : 0;
    const end = textarea ? textarea.selectionEnd : 0;
    const selectedText = value.substring(start, end);

    const inputUrl = window.prompt('Pega el enlace web (URL):', 'https://');
    if (!inputUrl || inputUrl.trim() === 'https://' || inputUrl.trim() === '') return;

    const cleanUrl = normalizeUrl(inputUrl);
    const label = selectedText.trim() || window.prompt('Texto que mostrará el enlace:', 'Abrir recurso') || cleanUrl;
    insertFormatting(`[${label}](`, `${cleanUrl})`, '');
  };

  // Interceptor inteligente de pegado (Pasting): detecta HTML copiado de Word/Web/Canvas/Teams y lo convierte a Markdown
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    // Si el portapapeles contiene datos HTML estructurados con enlaces o formato
    if (htmlData && htmlData.trim() && /<(a|b|strong|i|em|u|p|h[1-6]|ul|ol|li|table|blockquote)/i.test(htmlData)) {
      e.preventDefault();
      const convertedMarkdown = htmlToMarkdown(htmlData);

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + convertedMarkdown + value.substring(end);
        onChange(newValue);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + convertedMarkdown.length, start + convertedMarkdown.length);
        }, 30);
      } else {
        onChange(value ? `${value}\n\n${convertedMarkdown}` : convertedMarkdown);
      }

      setPasteNotice(true);
      setTimeout(() => setPasteNotice(false), 3500);
    }
  };

  return (
    <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition shadow-xs">
      
      {/* Barra de Herramientas y Conmutador de Pestañas */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Botones de Formato Rápido */}
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            onClick={() => insertFormatting('**', '**', 'texto en negrita')}
            title="Negrita (**texto**)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('*', '*', 'texto en cursiva')}
            title="Cursiva (*texto*)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('<u>', '</u>', 'texto subrayado')}
            title="Subrayado (<u>texto</u>)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('~~', '~~', 'texto tachado')}
            title="Tachado (~~texto~~)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting('\n## ', '\n', 'Título de Sección')}
            title="Título Principal (##)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition font-bold"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('\n### ', '\n', 'Subtítulo')}
            title="Subtítulo (###)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition font-bold"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting('\n- ', '', 'Elemento de lista')}
            title="Lista con viñetas (- )"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('\n1. ', '', 'Primer paso')}
            title="Lista numerada (1. )"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={handleInsertLink}
            title="Insertar Enlace Web [Texto](url)"
            className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition font-bold flex items-center gap-1"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Enlace</span>
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('\n> ', '\n', 'Nota o instrucción importante')}
            title="Cita o Destacado (> )"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('`', '`', 'código')}
            title="Código inline (`código`)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('\n```\n', '\n```\n', 'Bloque de código o texto')}
            title="Bloque de código (```...```)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertFormatting('\n---\n', '', '')}
            title="Línea divisoria (---)"
            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pestañas: Escribir / Vista Previa */}
        <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'write'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Escribir</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'preview'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Vista Previa</span>
          </button>
        </div>

      </div>

      {/* Aviso temporal al pegar texto enriquecido */}
      {pasteNotice && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 border-b border-emerald-200 flex items-center space-x-2 animate-in fade-in slide-in-from-top-1">
          <ClipboardCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">
            ¡Texto formateado pegado con éxito! Se han preservado los enlaces y estilos.
          </span>
        </div>
      )}

      {/* Área de Entrada / Vista Previa */}
      <div className="p-3">
        {activeTab === 'write' ? (
          <div>
            <textarea
              ref={textareaRef}
              rows={rows}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="w-full text-xs sm:text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent resize-y leading-relaxed font-sans min-h-[130px]"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 gap-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Pega texto copiado de <strong>Word, Teams, Canvas, PDFs o páginas web</strong> con sus enlaces y formatos.</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400 self-end sm:self-auto">
                {value.length} caracteres
              </span>
            </div>
          </div>
        ) : (
          <div className="min-h-[140px] max-h-80 overflow-y-auto p-3 touch-scroll bg-slate-50/70 rounded-xl border border-slate-100">
            {value.trim() ? (
              <RichTextRenderer content={value} />
            ) : (
              <p className="text-slate-400 text-xs italic py-8 text-center">
                Escribe o pega texto en la pestaña "Escribir" para ver aquí la vista previa de tu descripción con formato y enlaces web activos.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default RichTextEditor;
