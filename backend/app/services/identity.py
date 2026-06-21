import random

ADJECTIVES = ["微醺", "深夜", "温柔", "安静", "闪光", "清晨", "慢热", "同频", "漂浮", "蜂蜜色", "薄雾", "落日"]
NOUNS = ["海湾", "星尘", "山雾", "月光", "风铃", "云朵", "灯塔", "回声", "鲸鱼", "水母", "山雀", "信号"]
AVATARS = ["🌙", "🌊", "✨", "🪐", "🌌", "🫧", "🍃", "🔭", "🐳", "🦌", "🕯️", "🌃"]


def create_identity() -> tuple[str, str, str]:
    nickname = f"{random.choice(ADJECTIVES)}的{random.choice(NOUNS)}"
    avatar = random.choice(AVATARS)
    # theme color is decided by the user's emotion later; seed with a calm default.
    return nickname, avatar, "#8b5cf6"
