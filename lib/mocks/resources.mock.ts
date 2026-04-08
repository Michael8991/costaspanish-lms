import type { ResourceListItemDTO } from "@/lib/dto/resource.dto";

const CURRENT_TEACHER_ID = "67d1a1b2c3d4e5f607182930";
const OTHER_TEACHER_ID = "67d1a1b2c3d4e5f607182931";

export const mockResources: ResourceListItemDTO[] = [
  {
    id: "67f100000000000000000001",
    title: "A1 Greetings and Introductions Worksheet",
    description:
      "Printable worksheet for introducing yourself, asking for names, and basic greeting exchanges in beginner Spanish lessons.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "worksheet",

    levels: ["A1"],
    skills: ["speaking", "writing", "vocabulary"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["warmup", "guided_practice", "homework"],

    grammarTopics: ["ser", "subject pronouns", "basic questions"],
    vocabularyTopics: ["greetings", "countries", "nationalities"],
    tags: ["a1", "introductions", "basics", "starter"],

    estimatedDurationMinutes: 20,
    difficulty: 1,

    hasAnswerKey: true,
    requiresTeacherReview: false,
    timesUsed: 18,

    asset: {
      format: "pdf",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "a1-greetings-introductions.pdf",
      mimeType: "application/pdf",
      pageCount: 4,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-03-10T11:20:00.000Z",
  },
  {
    id: "67f100000000000000000002",
    title: "Food Vocabulary Flashcards",
    description:
      "Image-based flashcards to review common food and drink vocabulary with visual support.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "flashcards",

    levels: ["A1", "A2"],
    skills: ["vocabulary", "speaking", "reading"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["review", "freer_practice", "homework"],

    grammarTopics: ["articles", "gender and number"],
    vocabularyTopics: ["food", "drinks", "restaurant items"],
    tags: ["food", "flashcards", "visual", "a1", "a2"],

    estimatedDurationMinutes: 15,
    difficulty: 1,

    hasAnswerKey: false,
    requiresTeacherReview: false,
    timesUsed: 27,

    asset: {
      format: "image",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "food-vocabulary-flashcards.jpg",
      mimeType: "image/jpeg",
      pageCount: undefined,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-01-21T10:30:00.000Z",
    updatedAt: "2026-03-11T08:15:00.000Z",
  },
  {
    id: "67f100000000000000000003",
    title: "Slow Spanish Café Dialogue Audio",
    description:
      "Listening track with a slow-paced café conversation focused on ordering and polite requests.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "audio_track",

    levels: ["A2"],
    skills: ["listening", "pronunciation", "vocabulary"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["input", "guided_practice", "correction"],

    grammarTopics: ["quiero", "me gustaría", "polite requests"],
    vocabularyTopics: ["café", "ordering", "drinks", "snacks"],
    tags: ["listening", "cafe", "audio", "a2"],

    estimatedDurationMinutes: 12,
    difficulty: 2,

    hasAnswerKey: true,
    requiresTeacherReview: false,
    timesUsed: 34,

    asset: {
      format: "audio",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "slow-spanish-cafe-dialogue.mp3",
      mimeType: "audio/mpeg",
      pageCount: undefined,
      durationSeconds: 428,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-02-05T13:10:00.000Z",
    updatedAt: "2026-03-12T07:40:00.000Z",
  },
  {
    id: "67f100000000000000000004",
    title: "B1 Past Tenses Video Explanation",
    description:
      "Short explainer video comparing pretérito perfecto and indefinido with timeline examples.",
    status: "published",
    visibility: "private",
    pedagogicalType: "video_clip",

    levels: ["B1"],
    skills: ["listening", "grammar"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["input", "review", "guided_practice"],

    grammarTopics: ["pretérito perfecto", "pretérito indefinido", "time markers"],
    vocabularyTopics: ["life experiences", "recent actions"],
    tags: ["b1", "past tenses", "video", "grammar"],

    estimatedDurationMinutes: 18,
    difficulty: 3,

    hasAnswerKey: false,
    requiresTeacherReview: false,
    timesUsed: 12,

    asset: {
      format: "video",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "b1-past-tenses-video.mp4",
      mimeType: "video/mp4",
      pageCount: undefined,
      durationSeconds: 615,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-01-28T15:00:00.000Z",
    updatedAt: "2026-03-09T18:00:00.000Z",
  },
  {
    id: "67f100000000000000000005",
    title: "Present Tense Irregular Verbs Reference",
    description:
      "Compact grammar reference sheet for common present tense irregular verbs with usage notes.",
    status: "draft",
    visibility: "private",
    pedagogicalType: "grammar_reference",

    levels: ["A2", "B1"],
    skills: ["grammar", "reading", "writing"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["review", "input", "homework"],

    grammarTopics: ["present tense", "irregular verbs", "stem-changing verbs"],
    vocabularyTopics: ["daily routine", "common actions"],
    tags: ["grammar", "reference", "verbs", "a2", "b1"],

    estimatedDurationMinutes: 25,
    difficulty: 2,

    hasAnswerKey: true,
    requiresTeacherReview: false,
    timesUsed: 7,

    asset: {
      format: "pdf",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "present-irregular-verbs-reference.pdf",
      mimeType: "application/pdf",
      pageCount: 6,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-02-12T08:20:00.000Z",
    updatedAt: "2026-03-14T12:45:00.000Z",
  },
  {
    id: "67f100000000000000000006",
    title: "Picture Description Speaking Prompt",
    description:
      "Prompt card set for describing scenes, people, and actions in present and past contexts.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "speaking_prompt",

    levels: ["A2", "B1"],
    skills: ["speaking", "vocabulary", "pronunciation"],
    deliveryModes: ["classwork"],
    lessonStages: ["warmup", "freer_practice", "correction"],

    grammarTopics: ["hay", "estar + gerundio", "adjectives"],
    vocabularyTopics: ["people", "places", "actions", "appearance"],
    tags: ["speaking", "prompt", "fluency", "a2", "b1"],

    estimatedDurationMinutes: 30,
    difficulty: 2,

    hasAnswerKey: false,
    requiresTeacherReview: true,
    timesUsed: 22,

    asset: {
      format: "image",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "picture-description-speaking-prompt.png",
      mimeType: "image/png",
      pageCount: undefined,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: OTHER_TEACHER_ID,
      isMine: false,
    },

    createdAt: "2026-01-18T16:40:00.000Z",
    updatedAt: "2026-03-08T14:10:00.000Z",
  },
  {
    id: "67f100000000000000000007",
    title: "B2 Opinion Essay Writing Prompt",
    description:
      "Structured prompt and planning guide for opinion essays with connectors and argument scaffolding.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "writing_prompt",

    levels: ["B2"],
    skills: ["writing", "grammar", "reading"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["input", "guided_practice", "homework", "assessment"],

    grammarTopics: ["connectors", "subjunctive triggers", "opinion structures"],
    vocabularyTopics: ["education", "technology", "society"],
    tags: ["writing", "essay", "b2", "exam"],

    estimatedDurationMinutes: 45,
    difficulty: 4,

    hasAnswerKey: true,
    requiresTeacherReview: true,
    timesUsed: 15,

    asset: {
      format: "pdf",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "b2-opinion-essay-writing-prompt.pdf",
      mimeType: "application/pdf",
      pageCount: 8,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-02-08T09:50:00.000Z",
    updatedAt: "2026-03-13T17:05:00.000Z",
  },
  {
    id: "67f100000000000000000008",
    title: "Pronunciation Drill: Rolled R and Soft R",
    description:
      "Focused audio practice to contrast the Spanish tapped and rolled R with repetition segments.",
    status: "archived",
    visibility: "private",
    pedagogicalType: "audio_track",

    levels: ["A2", "B1", "B2"],
    skills: ["pronunciation", "listening", "speaking"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["input", "guided_practice", "correction"],

    grammarTopics: ["phonetics"],
    vocabularyTopics: ["minimal pairs", "common words with r"],
    tags: ["pronunciation", "audio", "rolled-r"],

    estimatedDurationMinutes: 10,
    difficulty: 3,

    hasAnswerKey: false,
    requiresTeacherReview: false,
    timesUsed: 9,

    asset: {
      format: "audio",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "pronunciation-r-drill.mp3",
      mimeType: "audio/mpeg",
      pageCount: undefined,
      durationSeconds: 301,
    },

    owner: {
      teacherId: OTHER_TEACHER_ID,
      isMine: false,
    },

    createdAt: "2025-12-20T11:00:00.000Z",
    updatedAt: "2026-02-18T09:30:00.000Z",
  },
  {
    id: "67f100000000000000000009",
    title: "Interactive Quiz: Ser vs Estar",
    description:
      "Quick diagnostic quiz to practise and assess contrastive uses of ser and estar.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "quiz",

    levels: ["A2", "B1"],
    skills: ["grammar", "reading", "writing"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["review", "guided_practice", "assessment"],

    grammarTopics: ["ser", "estar", "adjectival meaning changes"],
    vocabularyTopics: ["states", "identity", "location"],
    tags: ["quiz", "grammar", "ser-estar"],

    estimatedDurationMinutes: 15,
    difficulty: 2,

    hasAnswerKey: true,
    requiresTeacherReview: false,
    timesUsed: 41,

    asset: {
      format: "external_link",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      externalUrl: "https://example.com/resources/ser-vs-estar-quiz",
      originalFilename: undefined,
      mimeType: undefined,
      pageCount: undefined,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-02-03T14:00:00.000Z",
    updatedAt: "2026-03-15T10:10:00.000Z",
  },
  {
    id: "67f100000000000000000010",
    title: "Travel Situations Board Game",
    description:
      "Communicative board game with travel scenarios, role-play tasks, and question cards.",
    status: "draft",
    visibility: "private",
    pedagogicalType: "game",

    levels: ["B1"],
    skills: ["speaking", "listening", "vocabulary"],
    deliveryModes: ["classwork"],
    lessonStages: ["warmup", "freer_practice", "wrap_up"],

    grammarTopics: ["future plans", "conditional basics", "questions"],
    vocabularyTopics: ["travel", "transport", "hotels", "problems"],
    tags: ["game", "travel", "speaking", "b1"],

    estimatedDurationMinutes: 35,
    difficulty: 3,

    hasAnswerKey: false,
    requiresTeacherReview: true,
    timesUsed: 3,

    asset: {
      format: "pdf",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "travel-situations-board-game.pdf",
      mimeType: "application/pdf",
      pageCount: 10,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: CURRENT_TEACHER_ID,
      isMine: true,
    },

    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-15T18:20:00.000Z",
  },
  {
    id: "67f100000000000000000011",
    title: "C1 News Analysis Video Clip",
    description:
      "Authentic-style news clip for advanced listening, summarising, and critical discussion.",
    status: "published",
    visibility: "shared",
    pedagogicalType: "video_clip",

    levels: ["C1"],
    skills: ["listening", "speaking", "reading"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["input", "freer_practice", "assessment"],

    grammarTopics: ["reported speech", "advanced connectors"],
    vocabularyTopics: ["media", "politics", "current affairs"],
    tags: ["c1", "news", "video", "debate"],

    estimatedDurationMinutes: 28,
    difficulty: 5,

    hasAnswerKey: true,
    requiresTeacherReview: true,
    timesUsed: 11,

    asset: {
      format: "video",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
      externalUrl: undefined,
      originalFilename: "c1-news-analysis-video.mp4",
      mimeType: "video/mp4",
      pageCount: undefined,
      durationSeconds: 840,
    },

    owner: {
      teacherId: OTHER_TEACHER_ID,
      isMine: false,
    },

    createdAt: "2026-01-07T12:35:00.000Z",
    updatedAt: "2026-03-10T16:55:00.000Z",
  },
  {
    id: "67f100000000000000000012",
    title: "Spanish Reading Club Article",
    description:
      "External article for intermediate learners with guided comprehension and vocabulary review.",
    status: "archived",
    visibility: "shared",
    pedagogicalType: "reading_text",

    levels: ["B1", "B2"],
    skills: ["reading", "vocabulary", "speaking"],
    deliveryModes: ["classwork", "homework"],
    lessonStages: ["input", "guided_practice", "wrap_up", "homework"],

    grammarTopics: ["relative clauses", "past narration"],
    vocabularyTopics: ["culture", "lifestyle", "habits"],
    tags: ["reading", "article", "club", "b1", "b2"],

    estimatedDurationMinutes: 22,
    difficulty: 3,

    hasAnswerKey: true,
    requiresTeacherReview: false,
    timesUsed: 19,

    asset: {
      format: "external_link",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80",
      externalUrl: "https://example.com/resources/spanish-reading-club-article",
      originalFilename: undefined,
      mimeType: undefined,
      pageCount: undefined,
      durationSeconds: undefined,
    },

    owner: {
      teacherId: null,
      isMine: false,
    },

    createdAt: "2025-11-14T09:25:00.000Z",
    updatedAt: "2026-02-22T13:00:00.000Z",
  },
];