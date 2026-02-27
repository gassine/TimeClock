import React from 'react';

// A simple utility to wrap raw URL strings in an anchor tag safely
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function LinkifiedText({ text, className = '' }: { text: string, className?: string }) {
    if (!text) return null;

    // Split text by URLs and render anchors
    const parts = text.split(URL_REGEX);

    return (
        <span className={`whitespace-pre-wrap ${className}`}>
            {parts.map((part, i) => {
                if (part.match(URL_REGEX)) {
                    return (
                        <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                        >
                            {part}
                        </a>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
