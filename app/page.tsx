'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { askGpt } from '../lib/openai';

type VocabItem = {
  word: string;
  meaning: string;
  example: string;
};

export default function Page() {
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [current, setCurrent] = useState<VocabItem | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [hint2, setHint2] = useState('');
  const [hint3, setHint3] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'junior_vocab'));
      const data = snapshot.docs.map(doc => doc.data() as VocabItem);
      setVocabList(data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (vocabList.length > 0) showNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabList]);

  const showNext = () => {
    const random = vocabList[Math.floor(Math.random() * vocabList.length)];
    setCurrent(random);
    setInput('');
    setFeedback('');
    setHintLevel(0);
    setHint2('');
    setHint3('');
  };

  const checkAnswer = async () => {
    if (!current) return;
    setFeedback('判定中...');
    setLoading(true);

    const prompt = `英単語 "${current.word}" の正しい日本語の意味は「${current.meaning}」です。\nユーザーの入力は「${input}」です。\n\n次のルールに従って、「正解」または「不正解」を判定してください：\n- 全体の意味の一部であれば正解としてください\n- 表記が多少異なっていても、意味が同じであれば正解としてください（例：「十一」と「11」、「計画」と「プラン」、「正直」と「正直な人」など）\n- 同義語、言い換え、定義的な表現も意味が通じるなら正解\n- ただし、意味が異なる場合や、非常に抽象的すぎる表現（例：「もの」「道具」「果物」など）だけでは不正解\n- 出力形式：1行目：「正解」または「不正解」、2行目以降：その理由を簡潔に説明（ユーザーが納得できるように）`;

    const raw = await askGpt(prompt);
    const lines = raw.split('\n').map(line => line.trim()).filter(line => line);
    const judgment = lines[0];
    const reason = lines.slice(1).join('\n');

    if (judgment === '正解') {
      setFeedback(`✅ ${judgment}\n📝 ${reason}`);
    } else if (judgment === '不正解') {
      setFeedback(`❌ ${judgment}\n📝 ${reason}`);
    } else {
      setFeedback(`⚠️ 判定に失敗しました（AIの出力: ${judgment}）`);
    }

    setLoading(false);
  };

  const getHint = async (level: number) => {
    if (!current) return;
    const prompt = level === 2
      ? `あなたは英単語学習アプリのAIです。次の単語の意味を、正解の日本語訳を出さずに、中学校レベルの簡単な英単語だけを使って英語で説明してください。単語自体は使わないでください。単語: "${current.word}"`
      : `単語 "${current.word}" の意味を、日本語でやさしく、連想できるように説明してください。ただし正解そのものは含めないでください。`;

    const hint = await askGpt(prompt);
    if (level === 2) setHint2(hint);
    if (level === 3) setHint3(hint);
    setHintLevel(level);
  };

  return (
    <main className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      {current && (
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md space-y-4">
          <h1 className="text-3xl font-bold text-center">単語: {current.word}</h1>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="意味を入力..."
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={checkAnswer}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            答える
          </button>

          <div className="min-h-[100px] flex items-center justify-center">
            {loading && <p className="text-center text-gray-600">判定中...</p>}
            {feedback && <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap w-full">{feedback}</pre>}
          </div>

          <div className="space-y-2">
            {hintLevel === 0 && (
              <button
                onClick={() => setHintLevel(1)}
                className="w-full bg-green-400 text-white py-2 rounded hover:bg-green-500"
              >
                ヒント1（例文）
              </button>
            )}
            {hintLevel >= 1 && <p>ヒント1: {current.example}</p>}

            {hintLevel === 1 && (
              <button
                onClick={() => getHint(2)}
                className="w-full bg-yellow-400 text-white py-2 rounded hover:bg-yellow-500"
              >
                ヒント2（簡単な英語）
              </button>
            )}
            {hintLevel >= 2 && <p>ヒント2: {hint2}</p>}

            {hintLevel === 2 && (
              <button
                onClick={() => getHint(3)}
                className="w-full bg-pink-400 text-white py-2 rounded hover:bg-pink-500"
              >
                ヒント3（やさしい説明）
              </button>
            )}
            {hintLevel === 3 && <p>ヒント3: {hint3}</p>}
          </div>

          <button
            onClick={showNext}
            className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600 mt-4"
          >
            次の問題へ
          </button>
        </div>
      )}
    </main>
  );
}
