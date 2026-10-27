-- CreateTable
CREATE TABLE "ResearchArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ltr',
    "content" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OcrSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OcrPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "imageBase64" TEXT NOT NULL,
    "overlayBase64" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bands" TEXT,
    "sandboxCrops" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OcrPage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OcrSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptionLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "text" TEXT NOT NULL DEFAULT '',
    "latex" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "alternatives" TEXT,
    "notes" TEXT,
    "bbox" TEXT,
    "cropBase64" TEXT,
    "verifiedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TranscriptionLine_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "OcrPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Document',
    "docType" TEXT NOT NULL DEFAULT 'formatted-notes',
    "subject" TEXT NOT NULL,
    "blocks" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentProject_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OcrSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchArticle_subject_key" ON "ResearchArticle"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptionLine_pageId_order_key" ON "TranscriptionLine"("pageId", "order");

