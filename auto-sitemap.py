import os
import pathlib
import datetime
home=pathlib.Path.cwd()
print(home)

htmls=[]

dir_list=os.listdir(home)

print(dir_list)
if "sitemap.xml" in dir_list:
    print("sitemap.xml already exists")
    sitemap=str(home)+"/sitemap.xml"

def find_html_files():
    
    print(f"探索開始: {home}")
    # rglobを使って.htmlファイルを再帰的に探索
    # ※ファイル数が多い場合は少し時間がかかることがあります
    html_files = home.rglob("*.html")
    
    # 見つかったファイルの絶対パスを一つずつ出力
    count = 0
    for file_path in html_files:
        print(file_path)
        htmls.append(str(file_path).replace(str(home),"").replace("\\","/"))
        count += 1
        
    print(f"合計 {count} 個のHTMLファイルが見つかりました。")
    
def priority(input_files:str):
    priority_files=[["index"],
                    ["contact","about","howto"],
                    ["blog","news"],
                    ["contact"],
                    ["other"]]
    
    for i in range(len(priority_files)):
        for files in priority_files[i]:
            if files in input_files:
                return str(1.0 - i*0.2)
    
    return "0.2"

if __name__ == "__main__":
    find_html_files()
    print(htmls)
    
    with open(sitemap, mode='w') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for pages in htmls:
            f.write('  <url>\n')
            f.write(f'    <loc>https://focusmixer.com{pages}</loc>\n')
            f.write(f'    <lastmod>{datetime.date.today()}</lastmod>\n')
            f.write('    <changefreq>weekly</changefreq>\n')
            f.write(f'    <priority>{priority(pages)}</priority>\n')
            f.write('  </url>\n')
        f.write('</urlset>\n')

    print(f"sitemap.xml has been created at: {sitemap}")