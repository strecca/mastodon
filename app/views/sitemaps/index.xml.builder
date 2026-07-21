xml.instruct!
xml.urlset(xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9') do
  @urls.each do |entry|
    xml.url do
      xml.loc entry[:loc]
      xml.lastmod entry[:lastmod].xmlschema if entry[:lastmod]
    end
  end
end
