/** Durable settings namespace for product-wide GUI onboarding facts. */
export const WELCOME_NOTICE_SETTINGS_NAMESPACE = 'ui-onboarding'

/** Field storing the last welcome notice version the user acknowledged. */
export const WELCOME_NOTICE_ACK_FIELD = 'welcomeNoticeVersion'

/**
 * Bump only when the notice changes materially and every user should see it
 * again. The acknowledgement is compared for exact equality.
 */
export const WELCOME_NOTICE_VERSION = '2026-09-02.1'

/** The complete editable internal-testing notice in both supported GUI locales. */
export const WELCOME_NOTICE_COPY = {
  zh: {
    title: '内测声明',
    body: 'Zenwit 目前的 0.1 版本仍处在内测阶段，还有许多地方需要持续改进和打磨，希望听取你的反馈建议。预计 Zenwit 的核心能力以及基础服务会在接下来的一段时间内快速迭代、持续演化。\n\n我们期待与你一起，在开放、可复用、可组合的创作基础设施之上，共同探索更好的创作方式。欢迎加入 Zenwit 内测。',
    continueLabel: '继续',
  },
  en: {
    title: 'Internal Testing Notice',
    body: "Zenwit 0.1 is currently in private testing. Many areas still need improvement, and we welcome your feedback. Zenwit's core capabilities and foundation services will continue to evolve rapidly over the coming months.\n\nWe look forward to exploring better ways to create with you, building on open, reusable, and composable creative infrastructure. Welcome to the Zenwit private beta.",
    continueLabel: 'Continue',
  },
} as const
