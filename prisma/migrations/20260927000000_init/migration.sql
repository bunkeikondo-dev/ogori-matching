-- CreateTable
CREATE TABLE "TalkTheme" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchGroup" (
    "id" TEXT NOT NULL,
    "matchSize" INTEGER NOT NULL,
    "themeText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "contactValue" TEXT NOT NULL,
    "matchSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "matchGroupId" TEXT,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "date" TEXT NOT NULL,
    "twoMatchCount" INTEGER NOT NULL DEFAULT 0,
    "fourMatchCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "ip" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("ip")
);

-- CreateIndex
CREATE UNIQUE INDEX "TalkTheme_text_key" ON "TalkTheme"("text");

-- CreateIndex
CREATE INDEX "QueueEntry_status_matchSize_joinedAt_idx" ON "QueueEntry"("status", "matchSize", "joinedAt");

-- CreateIndex
CREATE INDEX "QueueEntry_status_expiresAt_idx" ON "QueueEntry"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "QueueEntry_matchGroupId_idx" ON "QueueEntry"("matchGroupId");

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_matchGroupId_fkey" FOREIGN KEY ("matchGroupId") REFERENCES "MatchGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
