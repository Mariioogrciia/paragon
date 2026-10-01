import io
p = 'src/app/page.tsx'
s = io.open(p, encoding='utf-8').read()
start = s.index('  return (\n    <div className="space-y-9">')
end = s.rindex('}\n')
new = io.open('scratch/cabina-nuevo.tsx', encoding='utf-8').read()
s = s[:start] + new + s[end:]
a = 'import { SectionTabs } from "@/components/SectionTabs";\n'
assert a in s
s = s.replace(a, '')
b = 'import { ArrowRight, Eye, Gift, Route, ShieldCheck } from "lucide-react";'
assert b in s
s = s.replace(b, 'import { ArrowRight, Eye, Gift, Route, ShieldCheck, SlidersHorizontal } from "lucide-react";')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', s.count('cabina-celda'))
