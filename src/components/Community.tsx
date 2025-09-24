"use client";

import { useState } from 'react';
import { createComment, createReaction } from '../utils/community-actions';
import { useAuth } from '../context/AuthContext';
import { Story, Comment } from '../lib/types';
import { useLocale } from '@/context/LocaleContext';

interface CommunityProps {
  story: Story;
}

const Community: React.FC<CommunityProps> = ({ story }) => {
  const { user } = useAuth();
  const { t } = useLocale();
  const [comment, setComment] = useState('');

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment) return;

    await createComment({ storyId: story.id, content: comment });
    setComment('');
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) return;
    await createReaction({ storyId: story.id, reactionType });
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">{t('community.title')}</h2>

      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => handleReaction('like')}
          className="p-2 rounded-full hover:bg-gray-200"
          aria-label="👍"
          title="👍"
        >
          👍
        </button>
        <button
          onClick={() => handleReaction('love')}
          className="p-2 rounded-full hover:bg-gray-200"
          aria-label="❤️"
          title="❤️"
        >
          ❤️
        </button>
        <button
          onClick={() => handleReaction('wow')}
          className="p-2 rounded-full hover:bg-gray-200"
          aria-label="😮"
          title="😮"
        >
          😮
        </button>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">{t('community.comments.title')}</h3>
        {user && (
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder={t('community.comments.placeholder')}
            />
            <button type="submit" className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
              {t('community.comments.submit')}
            </button>
          </form>
        )}
        <div className="space-y-4">
          {story.comments?.map((comment: Comment) => (
            <div key={comment.id} className="p-4 bg-gray-100 rounded">
              <div className="flex items-center mb-2">
                <img
                  src={comment.author.avatarUrl || '/default-avatar.png'}
                  alt={comment.author.displayname}
                  className="w-8 h-8 rounded-full mr-2"
                />
                <span className="font-semibold">{comment.author.displayname}</span>
              </div>
              <p>{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Community;
