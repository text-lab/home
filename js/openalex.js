'use strict';

const OPENALEX_AUTHOR_ID = 'A5053256654';

async function loadOpenAlexProfile() {
  const authorUrl = `https://api.openalex.org/authors/${OPENALEX_AUTHOR_ID}`;
  const worksUrl = `https://api.openalex.org/works?filter=authorships.author.id:https://openalex.org/${OPENALEX_AUTHOR_ID}&per-page=200`;

  try {
    const [authorRes, worksRes] = await Promise.all([
      fetch(authorUrl),
      fetch(worksUrl)
    ]);

    if (!authorRes.ok || !worksRes.ok) {
      throw new Error('OpenAlex request failed');
    }

    const author = await authorRes.json();
    const worksData = await worksRes.json();
    const works = worksData.results || [];

    const citations = author.cited_by_count ?? 0;
    const worksCount = author.works_count ?? works.length;

    const years = works.map(w => w.publication_year).filter(Boolean);
    const latestYear = years.length ? Math.max(...years) : 'not available';

    const coauthors = new Set();

    works.forEach(work => {
      (work.authorships || []).forEach(authorship => {
        const a = authorship.author;
        if (a && a.id && !a.id.endsWith(OPENALEX_AUTHOR_ID)) {
          coauthors.add(a.id);
        }
      });
    });

    const topicCounts = new Map();

    works.forEach(work => {
      (work.topics || []).forEach(topic => {
        const name = topic.display_name;
        if (!name) return;
        topicCounts.set(name, (topicCounts.get(name) || 0) + 1);
      });
    });

    const topTopics = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
      .join(', ');

    setText('oa-citations', citations.toLocaleString('en-GB'));
    setText('oa-works', '>' + worksCount.toLocaleString('en-GB'));
    setText('oa-latest-year', latestYear);
    setText('oa-coauthors', coauthors.size.toLocaleString('en-GB'));
    setText('oa-topics', topTopics || 'Topics not available');

    setText('stat-works', '>' + worksCount.toLocaleString('en-GB'));

  } catch (error) {
    console.warn(error);

    setText('oa-citations', 'Not available');
    setText('oa-works', 'Not available');
    setText('oa-latest-year', 'Not available');
    setText('oa-coauthors', 'Not available');
    setText('oa-topics', 'OpenAlex data could not be loaded');
    
    setText('stat-works', '-');
    
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

loadOpenAlexProfile();