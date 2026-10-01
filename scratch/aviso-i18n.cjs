const fs=require('fs');
const T={es:{titulo:"Trofeo desbloqueado",cerrar:"Cerrar",mas:"{n, plural, one {+# trofeo nuevo más} other {+# trofeos nuevos más}}"},
en:{titulo:"Trophy unlocked",cerrar:"Close",mas:"{n, plural, one {+# more new trophy} other {+# more new trophies}}"},
de:{titulo:"Trophäe freigeschaltet",cerrar:"Schließen",mas:"{n, plural, one {+# weitere neue Trophäe} other {+# weitere neue Trophäen}}"},
fr:{titulo:"Trophée débloqué",cerrar:"Fermer",mas:"{n, plural, one {+# nouveau trophée} other {+# nouveaux trophées}}"}};
for(const l of Object.keys(T)){const p='messages/Onboarding/'+l+'.json';const d=JSON.parse(fs.readFileSync(p,'utf8'));d.trofeoDesbloqueado=T[l];fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n')}
console.log('ok')
