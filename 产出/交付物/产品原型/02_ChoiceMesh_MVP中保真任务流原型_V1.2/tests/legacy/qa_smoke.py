from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def main():
    prototype = Path(__file__).with_name("index.html").resolve().as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.goto(prototype)
        page.wait_for_load_state("load")

        expect(page.get_by_text("3/4 已反馈", exact=True)).to_be_visible()
        page.get_by_role("button", name="私密提醒 Maya").click()
        expect(page.get_by_text("状态仍为“等待回复”", exact=False)).to_be_visible()
        expect(page.get_by_text("3/4 已反馈", exact=True)).to_be_visible()

        page.get_by_role("button", name="模拟：Maya 本人提交反馈").click()
        expect(page.get_by_text("4/4 已反馈", exact=True)).to_be_visible()
        page.get_by_role("button", name="成员反馈").click()
        page.get_by_role("button", name="我已核实，可以参加").click()
        expect(page.get_by_text("已记录成员本人确认。", exact=True)).to_be_visible()

        page.get_by_role("button", name="候选比较").click()
        provisional = page.get_by_role("button", name="暂定 C")
        expect(provisional).to_be_enabled()
        provisional.click()
        expect(page.get_by_text("C 已满足最低参与规则。", exact=True)).to_be_visible()

        page.get_by_role("checkbox").check()
        publish = page.get_by_role("button", name="发布 C")
        expect(publish).to_be_enabled()
        publish.click()
        expect(page.get_by_text("周日的 C 方案已确认。", exact=True)).to_be_visible()

        page.get_by_role("button", name="仍有问题").click()
        expect(page.get_by_text("成员提出新问题：房间已回到协调中", exact=False)).to_be_visible()
        browser.close()


if __name__ == "__main__":
    main()
