import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Database, ExternalLink, Info, Key, Languages } from 'lucide-react';
import { parseReference, generateExplanation, testAiConnection, type AiConfig } from './lib/gemini';
import pLimit from 'p-limit';

const translations: any = {
  zh: {
    title: "學術引用驗證工具",
    beta: "測試版",
    description: "貼入最多 20 條學術引用（每行一條），以驗證其是否與外部學術元數據來源一致。可使用 AI 輔助將引用文獻整理成每行一條。",
    sourceManagement: "來源管理",
    enabled: "已啟用",
    disabled: "已停用",
    apiKeyRequired: "需要 API Key",
    apiKeyOptional: "API Key 非強制",
    notApplicable: "不適用",
    noApiKeyNeeded: "不需 API Key",
    apiGuidance: "API 申請與設定指引",
    westernNonBook: "西方非圖書類 (期刊、會議論文等)",
    bookSources: "圖書類 (Global Books)",
    nonWesternNonBook: "非西方非圖書類 (Google Scholar)",
    references: "引用文獻",
    placeholder: "在此貼入引用文獻，每行一條...",
    refCount: "條引用",
    verifyBtn: "驗證引用",
    verifyingBtn: "驗證中...",
    errorEmpty: "請輸入至少一條引用。",
    errorLimit: "一次最多請輸入 20 條引用。",
    results: "結果",
    statusQueued: "排隊中...",
    statusParsing: "解析中...",
    statusSearching: "搜尋來源中...",
    statusExplaining: "生成說明中...",
    statusError: "錯誤",
    manualReview: "建議手動審核",
    openRecord: "開啟紀錄",
    verifySource: "驗證來源",
    parsedMetadata: "解析後的元數據",
    bestMatch: "最佳外部匹配",
    aiExplanation: "AI 說明",
    matched: "匹配：",
    mismatched: "不匹配/缺失：",
    noCandidate: "在外部來源中找不到候選對象。",
    googleScholarTitle: "Google Scholar 檢索結果 (非 API)",
    gsExact: "標題完全匹配",
    gsSimilar: "標題部分/近似匹配",
    gsNoMatch: "未找到類似標題",
    gsSearchUrl: "前往 Google Scholar 手動驗證",
    gsFetchFailed: "抓取失敗，請點擊上方連結手動驗證",
    categoryConfirmed: "已確認",
    categoryLikely: "可能存在但引用有誤",
    categoryNearMatch: "可能的近似匹配",
    categoryNotVerified: "未驗證",
    unknown: "未知",
    aiSettings: "AI 設定",
    aiProvider: "AI 提供者",
    aiApiKey: "AI API 金鑰",
    aiBaseUrl: "API 基礎網址 (Base URL)",
    aiModel: "模型名稱 (Model Name)",
    getGeminiKey: "取得 Gemini API 金鑰",
    saveSettings: "儲存設定",
    settingsSaved: "設定已儲存",
    openRouterHint: "提示：若使用 OpenRouter，基礎網址通常為 https://openrouter.ai/api/v1。請確保「模型名稱」填入正確的 ID（例如 google/gemini-2.0-flash-001），而非顯示名稱。",
    geminiHint: "提示：若使用 Gemini，基礎網址將被忽略。",
    modelList: "查看可用模型列表",
    testConnection: "測試連線",
    testing: "測試中...",
    connectionSuccess: "連線成功！",
    connectionFailed: "連線失敗：",
  },
  en: {
    title: "Academic Reference Verifier",
    beta: "Beta",
    description: "Paste up to 20 academic references (one per line) to verify them against external scholarly metadata sources. You can use AI assistance to organize your references into one per line.",
    sourceManagement: "Source Management",
    enabled: "Enabled",
    disabled: "Disabled",
    apiKeyRequired: "API Key Required",
    apiKeyOptional: "API Key Optional",
    notApplicable: "N/A",
    noApiKeyNeeded: "No API Key Needed",
    apiGuidance: "API Application Guidance",
    westernNonBook: "Western Non-Book (Journals, Conferences)",
    bookSources: "Book Sources (Global Books)",
    nonWesternNonBook: "Non-Western Non-Book (Google Scholar)",
    references: "References",
    placeholder: "Paste references here, one per line...",
    refCount: "references",
    verifyBtn: "Verify References",
    verifyingBtn: "Verifying...",
    errorEmpty: "Please enter at least one reference.",
    errorLimit: "Please enter a maximum of 20 references at a time.",
    results: "Results",
    statusQueued: "Queued...",
    statusParsing: "Parsing...",
    statusSearching: "Searching Sources...",
    statusExplaining: "Generating Explanation...",
    statusError: "Error",
    manualReview: "Manual Review Suggested",
    openRecord: "Open Record",
    verifySource: "Verify Source",
    parsedMetadata: "Parsed Metadata",
    bestMatch: "Best External Match",
    aiExplanation: "AI Explanation",
    matched: "Matched: ",
    mismatched: "Mismatched/Missing: ",
    noCandidate: "No candidate found in external sources.",
    googleScholarTitle: "Google Scholar Search Results (Non-API)",
    gsExact: "Exact Title Match",
    gsSimilar: "Similar Title Match",
    gsNoMatch: "No Similar Results",
    gsSearchUrl: "Open Google Scholar Search",
    gsFetchFailed: "Fetch failed, please verify manually via link above",
    categoryConfirmed: "Confirmed",
    categoryLikely: "Likely Exists But Citation Incorrect",
    categoryNearMatch: "Possible Near Match",
    categoryNotVerified: "Not Verified",
    unknown: "Unknown",
    aiSettings: "AI Settings",
    aiProvider: "AI Provider",
    aiApiKey: "AI API Key",
    aiBaseUrl: "API Base URL",
    aiModel: "Model Name",
    getGeminiKey: "Get Gemini API Key",
    saveSettings: "Save Settings",
    settingsSaved: "Settings Saved",
    openRouterHint: "Tip: For OpenRouter, the Base URL is usually https://openrouter.ai/api/v1. Ensure 'Model Name' is a valid ID (e.g., google/gemini-2.0-flash-001), not a display name.",
    geminiHint: "Tip: For Gemini, the Base URL is ignored.",
    modelList: "View available models",
    testConnection: "Test Connection",
    testing: "Testing...",
    connectionSuccess: "Connection successful!",
    connectionFailed: "Connection failed: ",
  }
};

export default function App() {
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const t = translations[language];

  const [input, setInput] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<any>(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return {
      enabledSources: {
        crossref: true,
        openalex: true,
        semanticScholar: true,
        pubmed: true,
        europepmc: true,
        googlebooks: true,
        openlibrary: true,
        googlescholar: true,
      },
      providerConfigs: {
        crossref: { mailto: '' },
        openalex: { apiKey: '' },
        semanticScholar: { apiKey: '' },
        googlebooks: { apiKey: '' },
      }
    };
  });

  const [aiConfig, setAiConfig] = useState<AiConfig>(() => {
    const saved = localStorage.getItem('ai_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved AI config', e);
      }
    }
    return {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3-flash-preview'
    };
  });

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('ai_config', JSON.stringify(aiConfig));
  }, [aiConfig]);

  const handleVerify = async () => {
    const lines = input.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setError(t.errorEmpty);
      return;
    }
    if (lines.length > 20) {
      setError(t.errorLimit);
      return;
    }

    setError('');
    setLoading(true);
    
    const initialResults = lines.map(line => ({
      rawInput: line,
      status: 'queued'
    }));
    setResults(initialResults);

    const limit = pLimit(3);

    const processReference = async (rawRef: string, index: number) => {
      try {
        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = { ...newResults[index], status: 'parsing' };
          return newResults;
        });

        const parsed = await parseReference(rawRef, aiConfig);

        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = { ...newResults[index], status: 'searching', parsedMetadata: parsed };
          return newResults;
        });

        const searchResponse = await fetch('/api/searchExternal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ parsedReference: parsed, settings }),
        });

        if (!searchResponse.ok) {
          throw new Error(`Server error: ${searchResponse.statusText}`);
        }

        const scoredMatch = await searchResponse.json();

        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = { ...newResults[index], status: 'explaining', bestCandidate: scoredMatch.bestCandidate };
          return newResults;
        });

        const explanation = await generateExplanation(parsed, scoredMatch, aiConfig);

        let confirmationUrl = null;
        if (scoredMatch.bestCandidate) {
          if (scoredMatch.bestCandidate.doi) {
            confirmationUrl = `https://doi.org/${scoredMatch.bestCandidate.doi}`;
          } else if (scoredMatch.bestCandidate.url) {
            confirmationUrl = scoredMatch.bestCandidate.url;
          }
        }

        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            rawInput: rawRef,
            status: 'completed',
            parsedMetadata: parsed,
            bestCandidate: scoredMatch.bestCandidate,
            resultCategory: scoredMatch.category,
            confidenceScore: scoredMatch.score,
            matchedFields: scoredMatch.matchedFields,
            mismatchedFields: scoredMatch.mismatchedFields,
            explanation,
            confirmationUrl,
            googleScholar: scoredMatch.googleScholar,
            needsManualReview: scoredMatch.category === 'not_verified' || scoredMatch.category === 'possible_near_match' || !!scoredMatch.googleScholar,
          };
          return newResults;
        });
      } catch (err: any) {
        console.error(`Error processing reference: ${rawRef}`, err);
        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            rawInput: rawRef,
            status: 'error',
            error: err.message || 'Failed to process reference',
            resultCategory: 'not_verified',
          };
          return newResults;
        });
      }
    };

    const promises = lines.map((line, index) => limit(() => processReference(line, index)));
    await Promise.all(promises);

    setLoading(false);
  };

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'likely_exists_but_citation_incorrect':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'possible_near_match':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'not_verified':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'confirmed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'likely_exists_but_citation_incorrect':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'possible_near_match':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'not_verified':
      default:
        return <HelpCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatCategory = (category: string) => {
    if (!category) return t.unknown;
    switch (category) {
      case 'confirmed': return t.categoryConfirmed;
      case 'likely_exists_but_citation_incorrect': return t.categoryLikely;
      case 'possible_near_match': return t.categoryNearMatch;
      case 'not_verified': return t.categoryNotVerified;
      default: return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-start">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Languages className="w-4 h-4 text-blue-600" />
            {language === 'en' ? '中文' : 'English'}
          </button>
        </div>

        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t.title} <span className="text-sm font-normal text-gray-400 align-top">{t.beta}</span>
            </h1>
            <p className="text-gray-500">
              {t.description}
            </p>
          </div>
        </header>

        <SourceManagement settings={settings} setSettings={setSettings} t={t} />

        <AiSettingsSection aiConfig={aiConfig} setAiConfig={setAiConfig} t={t} />

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div>
            <label htmlFor="references" className="block text-sm font-medium text-gray-700 mb-2">
              {t.references}
            </label>
            <textarea
              id="references"
              rows={8}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {input.split('\n').filter(line => line.trim().length > 0).length} / 20 {t.refCount}
            </div>
            <button
              onClick={handleVerify}
              disabled={loading || input.trim().length === 0}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.verifyingBtn}
                </>
              ) : (
                t.verifyBtn
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              {error}
            </div>
          )}
        </section>

        {results.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-medium">{t.results}</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <ResultCard key={index} result={result} index={index} getBadgeColor={getBadgeColor} getIcon={getIcon} formatCategory={formatCategory} t={t} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function ResultCard({ result, index, getBadgeColor, getIcon, formatCategory, t }: any) {
  const [expanded, setExpanded] = useState(false);

  const isPending = ['queued', 'parsing', 'searching', 'explaining'].includes(result.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div 
        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${!isPending ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => !isPending && setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate" title={result.rawInput}>
            {index + 1}. {result.rawInput}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {result.status === 'queued' && t.statusQueued}
                {result.status === 'parsing' && t.statusParsing}
                {result.status === 'searching' && t.statusSearching}
                {result.status === 'explaining' && t.statusExplaining}
              </span>
            ) : result.status === 'error' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t.statusError}
              </span>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(result.resultCategory)}`}>
                  {getIcon(result.resultCategory)}
                  {formatCategory(result.resultCategory)}
                </span>
                {result.bestCandidate?.source && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    <Database className="w-3 h-3" />
                    {result.bestCandidate.source}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Score: {result.confidenceScore}
                </span>
                {result.needsManualReview && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {t.manualReview}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          {result.confirmationUrl && (
            <a 
              href={result.confirmationUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">{t.openRecord}</span>
            </a>
          )}
          {!isPending && (
            <div className="text-gray-400">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          )}
        </div>
      </div>

      {expanded && !isPending && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4 text-sm">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">{t.parsedMetadata}</h3>
              <div className="bg-white p-3 rounded-lg border border-gray-200 overflow-auto max-h-60">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(result.parsedMetadata, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center justify-between">
                {t.bestMatch}
                {result.confirmationUrl && (
                  <a 
                    href={result.confirmationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-normal"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t.verifySource}
                  </a>
                )}
              </h3>
              <div className="bg-white p-3 rounded-lg border border-gray-200 overflow-auto max-h-60">
                {result.bestCandidate ? (
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(result.bestCandidate, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">{t.noCandidate}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
            <h3 className="font-medium text-gray-900">{t.aiExplanation}</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {result.explanation}
            </p>
            
            {result.matchedFields && result.matchedFields.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="font-medium text-green-700">{t.matched}</span>
                <span className="text-gray-600">{result.matchedFields.join(', ')}</span>
              </div>
            )}
            {result.mismatchedFields && result.mismatchedFields.length > 0 && (
              <div className="text-xs">
                <span className="font-medium text-red-700">{t.mismatched}</span>
                <span className="text-gray-600">{result.mismatchedFields.join(', ')}</span>
              </div>
            )}
          </div>

          {result.googleScholar && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  {t.googleScholarTitle}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  result.googleScholar.classification === 'exact_title_match' 
                    ? 'bg-green-100 text-green-800'
                    : result.googleScholar.classification === 'similar_title_match'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {result.googleScholar.classification === 'exact_title_match' && t.gsExact}
                  {result.googleScholar.classification === 'similar_title_match' && t.gsSimilar}
                  {result.googleScholar.classification === 'no_similar_result' && t.gsNoMatch}
                </span>
              </h3>
              
              <div className="space-y-2">
                {result.googleScholar.candidates.map((cand: any, i: number) => (
                  <div key={i} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
                    <a href={cand.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline block mb-1">
                      {cand.title}
                    </a>
                    <p className="text-gray-500 line-clamp-2">{cand.snippet}</p>
                  </div>
                ))}
                
                {result.googleScholar.status === 'fetch_failed' && (
                  <p className="text-xs text-red-500 italic">{t.gsFetchFailed}</p>
                )}
                
                <a 
                  href={result.googleScholar.searchUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline pt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.gsSearchUrl}
                </a>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function SourceManagement({ settings, setSettings, t }: { settings: any, setSettings: (s: any) => void, t: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSource = (id: string) => {
    setSettings({
      ...settings,
      enabledSources: {
        ...settings.enabledSources,
        [id]: !settings.enabledSources[id]
      }
    });
  };

  const updateConfig = (id: string, field: string, value: string) => {
    setSettings({
      ...settings,
      providerConfigs: {
        ...settings.providerConfigs,
        [id]: {
          ...settings.providerConfigs[id],
          [field]: value
        }
      }
    });
  };

  const groups = [
    {
      title: t.westernNonBook,
      sources: [
        { id: 'crossref', name: 'Crossref', keyReq: 'optional', info: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/', hasConfig: true, configField: 'mailto', configPlaceholder: 'email@example.com' },
        { id: 'openalex', name: 'OpenAlex', keyReq: 'optional', info: 'https://docs.openalex.org/', hasConfig: true, configField: 'apiKey', configPlaceholder: 'API Key' },
        { id: 'semanticScholar', name: 'Semantic Scholar', keyReq: 'mandatory', info: 'https://www.semanticscholar.org/product/api', hasConfig: true, configField: 'apiKey', configPlaceholder: 'API Key' },
        { id: 'pubmed', name: 'PubMed', keyReq: 'none', info: 'https://www.ncbi.nlm.nih.gov/books/NBK25497/' },
        { id: 'europepmc', name: 'Europe PMC', keyReq: 'none', info: 'https://europepmc.org/developers' },
      ]
    },
    {
      title: t.bookSources,
      sources: [
        { id: 'googlebooks', name: 'Google Books API', keyReq: 'recommended', info: 'https://developers.google.com/books', hasConfig: true, configField: 'apiKey', configPlaceholder: 'API Key' },
        { id: 'openlibrary', name: 'Open Library API', keyReq: 'none', info: 'https://openlibrary.org/developers/api' },
      ]
    },
    {
      title: t.nonWesternNonBook,
      sources: [
        { id: 'googlescholar', name: 'Google Scholar', keyReq: 'none', note: 'Non-API integration', info: 'https://scholar.google.com' },
      ]
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Database className="w-4 h-4 text-blue-600" />
          {t.sourceManagement}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-6">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.title}</h4>
              <div className="grid grid-cols-1 gap-3">
                {group.sources.map((source) => (
                  <div key={source.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={settings.enabledSources[source.id]} 
                          onChange={() => toggleSource(source.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{source.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              source.keyReq === 'mandatory' ? 'bg-red-50 text-red-700' : 
                              source.keyReq === 'recommended' ? 'bg-yellow-50 text-yellow-700' :
                              source.keyReq === 'optional' ? 'bg-blue-50 text-blue-700' :
                              'bg-gray-50 text-gray-500'
                            }`}>
                              {source.keyReq === 'mandatory' ? t.apiKeyRequired :
                               source.keyReq === 'recommended' ? t.apiKeyOptional :
                               source.keyReq === 'optional' ? t.apiKeyOptional :
                               t.noApiKeyNeeded}
                            </span>
                            {source.info && (
                              <a href={source.info} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                Info <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs font-medium ${settings.enabledSources[source.id] ? 'text-green-600' : 'text-gray-400'}`}>
                        {settings.enabledSources[source.id] ? t.enabled : t.disabled}
                      </div>
                    </div>

                    {source.hasConfig && settings.enabledSources[source.id] && (
                      <div className="pt-2 border-t border-gray-50">
                        <label className="text-[10px] font-medium text-gray-500 mb-1 block uppercase">
                          {source.configField === 'mailto' ? 'Contact Email (Polite Pool)' : 'API Key'}
                        </label>
                        <input 
                          type={source.configField === 'apiKey' ? 'password' : 'text'}
                          value={settings.providerConfigs[source.id]?.[source.configField] || ''}
                          onChange={(e) => updateConfig(source.id, source.configField, e.target.value)}
                          placeholder={source.configPlaceholder}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiSettingsSection({ aiConfig, setAiConfig, t }: { aiConfig: AiConfig, setAiConfig: (c: AiConfig) => void, t: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(aiConfig);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    setAiConfig(localConfig);
    alert(t.settingsSaved);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const success = await testAiConnection(localConfig);
      if (success) {
        alert(t.connectionSuccess);
      }
    } catch (error: any) {
      alert(`${t.connectionFailed}${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Key className="w-4 h-4 text-purple-600" />
          {t.aiSettings}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{t.aiProvider}</label>
              <select 
                className="w-full p-2 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-purple-500"
                value={localConfig.provider}
                onChange={(e) => setLocalConfig({ ...localConfig, provider: e.target.value as any })}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai-compatible">OpenAI Compatible (OpenRouter, etc.)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center justify-between">
                {t.aiModel}
                {localConfig.provider === 'openai-compatible' && (
                  <a 
                    href="https://openrouter.ai/models" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    {t.modelList} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </label>
              <input 
                type="text"
                className="w-full p-2 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-purple-500"
                placeholder={localConfig.provider === 'gemini' ? 'gemini-3-flash-preview' : 'google/gemini-2.0-flash-001'}
                value={localConfig.model}
                onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center justify-between">
                {t.aiApiKey}
                {localConfig.provider === 'gemini' && (
                  <a 
                    href="https://aistudio.google.com/app/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    {t.getGeminiKey} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </label>
              <input 
                type="password"
                className="w-full p-2 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="sk-..."
                value={localConfig.apiKey}
                onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              />
            </div>

            {localConfig.provider === 'openai-compatible' && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600">{t.aiBaseUrl}</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="https://openrouter.ai/api/v1"
                  value={localConfig.baseUrl || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-gray-500 italic">
              {localConfig.provider === 'gemini' ? t.geminiHint : t.openRouterHint}
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleTest}
                disabled={testing || !localConfig.apiKey}
                className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {testing ? t.testing : t.testConnection}
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
              >
                {t.saveSettings}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

