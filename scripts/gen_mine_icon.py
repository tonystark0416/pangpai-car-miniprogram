# 生成 tabBar「我的」图标（img/mine_sel.png / img/mine_seled.png）
# 风格对齐现有 index/order 图标：200x200、18px 圆头描边、灰 #8E8E93 / 蓝 #007AFF
# 用法：python3 scripts/gen_mine_icon.py
from PIL import Image, ImageDraw
import os

S = 800          # 4x 超采样，最后缩到 200
W = 72           # 描边宽（PIL 的 arc/outline 宽度向椭圆内侧延伸）
GRAY = (142, 142, 147, 255)
BLUE = (0, 122, 255, 255)
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'img')

def person(color, path):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # 头部圆环
    d.ellipse((290, 150, 510, 370), outline=color, width=W)
    # 肩部弧线（上半圆），bbox 外沿即描边外沿
    d.arc((190, 450, 610, 910), start=180, end=360, fill=color, width=W)
    # 圆头：圆心放在描边带的中线上（rx = 210 - 36 = 174），与弧线端点齐平不外凸
    d.ellipse((226 - 36, 680 - 36, 226 + 36, 680 + 36), fill=color)
    d.ellipse((574 - 36, 680 - 36, 574 + 36, 680 + 36), fill=color)
    im = im.resize((200, 200), Image.LANCZOS)
    im.save(path)
    print('saved', os.path.normpath(path))

person(GRAY, os.path.join(OUT_DIR, 'mine_sel.png'))
person(BLUE, os.path.join(OUT_DIR, 'mine_seled.png'))
