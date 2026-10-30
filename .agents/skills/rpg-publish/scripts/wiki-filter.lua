-- rpg-publish wiki filter.
-- 1. Tag PREP / READ-ALOUD blockquotes as callouts so the template can style them
--    (and so PREP boxes can be hidden in Player view).
-- 2. Default the document <title> to its first level-1 heading.

local function lead_label(bq)
  local first = bq.content[1]
  if first and first.t == "Para" then
    local lead = first.content[1]
    if lead and lead.t == "Strong" then
      return pandoc.utils.stringify(lead):upper()
    end
  end
  return nil
end

function BlockQuote(bq)
  local label = lead_label(bq)
  local cls
  if label then
    if label:match("^READ%-ALOUD") then
      cls = "read-aloud"
    elseif label:match("^PREP") then
      cls = "prep"
    end
  end
  if cls then
    return pandoc.Div(bq.content, pandoc.Attr("", { "callout", cls }))
  end
  return nil
end

function Pandoc(doc)
  if not doc.meta.title then
    for _, blk in ipairs(doc.blocks) do
      if blk.t == "Header" and blk.level == 1 then
        doc.meta.title = pandoc.MetaInlines(blk.content)
        break
      end
    end
  end
  return doc
end
