import type { StoryProject } from '../types';
import { orderedChapters } from '../types';

interface TimelineProps {
  project: StoryProject;
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
}

export function Timeline({ project, selectedChapterId, onSelectChapter }: TimelineProps) {
  const chapters = orderedChapters(project);
  const rows = [
    ...project.plots.map((plot) => ({
      id: plot.id,
      name: plot.name,
      kind: 'plot' as const,
      chapterIds: plot.chapter_ids,
      related: plot.related_plot_ids,
    })),
    ...project.subplots.map((subplot) => ({
      id: subplot.id,
      name: subplot.name,
      kind: 'subplot' as const,
      chapterIds: subplot.chapter_ids,
      related: subplot.related_subplot_ids,
    })),
  ];

  const columnCount = Math.max(chapters.length, 1);

  return (
    <section className="timeline" aria-label="Story timeline">
      <header className="panel-header">
        <h2>Timeline</h2>
        <span className="muted">
          {chapters.length} chapter{chapters.length === 1 ? '' : 's'} · {rows.length}{' '}
          storyline{rows.length === 1 ? '' : 's'}
        </span>
      </header>

      {chapters.length === 0 ? (
        <p className="empty">Add a chapter to begin the timeline.</p>
      ) : (
        <div
          className="timeline-grid"
          style={{
            gridTemplateColumns: `10rem repeat(${columnCount}, minmax(8rem, 1fr))`,
          }}
        >
          <div className="timeline-corner" />
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className={`timeline-chapter${selectedChapterId === chapter.id ? ' selected' : ''}`}
              onClick={() => onSelectChapter(chapter.id)}
            >
              <strong>{chapter.title}</strong>
              {chapter.subtitle ? <span>{chapter.subtitle}</span> : null}
            </button>
          ))}

          {rows.length === 0 ? (
            <div className="timeline-empty-row" style={{ gridColumn: `1 / span ${columnCount + 1}` }}>
              No plots or subplots yet.
            </div>
          ) : (
            rows.map((row) => (
              <TimelineRow
                key={row.id}
                name={row.name}
                kind={row.kind}
                chapters={chapters}
                chapterIds={row.chapterIds}
                relatedCount={row.related.length}
                onSelectChapter={onSelectChapter}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function TimelineRow({
  name,
  kind,
  chapters,
  chapterIds,
  relatedCount,
  onSelectChapter,
}: {
  name: string;
  kind: 'plot' | 'subplot';
  chapters: StoryProject['chapters'];
  chapterIds: string[];
  relatedCount: number;
  onSelectChapter: (chapterId: string) => void;
}) {
  const covered = new Set(chapterIds);
  return (
    <>
      <div className="timeline-row-label">
        <span className={`pill ${kind}`}>{kind}</span>
        <strong>{name}</strong>
        {relatedCount > 0 ? <span className="muted">{relatedCount} linked</span> : null}
      </div>
      {chapters.map((chapter) => {
        const active = covered.has(chapter.id);
        return (
          <button
            key={`${name}-${chapter.id}`}
            type="button"
            className={`timeline-cell${active ? ' active' : ''}`}
            aria-label={`${name} in ${chapter.title}`}
            onClick={() => onSelectChapter(chapter.id)}
          >
            {active ? <span className="segment" /> : null}
          </button>
        );
      })}
    </>
  );
}
