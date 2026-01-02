<mxGraphModel dx="3200" dy="2000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2400" pageHeight="2800" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    
    <mxCell id="title" value="&lt;h1&gt;Vibe Code Team Workflow: 3 คนทำงานพร้อมกัน&lt;/h1&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;" vertex="1" parent="1">
      <mxGeometry x="800" y="20" width="800" height="40" as="geometry" />
    </mxCell>
    
    <mxCell id="subtitle" value="&lt;b&gt;GAP (Report A) | Por (Report B) | Cherry (Report C)&lt;/b&gt;&lt;br&gt;แต่ละคนทำงานแยกกัน แต่ใช้ Staging ร่วมกัน" style="text;html=1;strokeColor=none;fillColor=#e1d5e7;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=1;fontSize=14;" vertex="1" parent="1">
      <mxGeometry x="800" y="70" width="800" height="50" as="geometry" />
    </mxCell>

    <!-- STAGING BRANCH (กองกลาง) -->
    <mxCell id="staging_bg" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="100" y="150" width="2200" height="120" as="geometry" />
    </mxCell>
    <mxCell id="staging_lbl" value="&lt;b&gt;📦 STAGING BRANCH (กองกลางที่ทุกคนใช้ร่วมกัน)&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;fontSize=16;fontColor=#5a189a;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="120" y="160" width="500" height="30" as="geometry" />
    </mxCell>
    <mxCell id="staging_code" value="&lt;b&gt;โค้ดล่าสุดของทีม&lt;/b&gt;&lt;br&gt;(รวมงานของทุกคน)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=14;" vertex="1" parent="1">
      <mxGeometry x="1050" y="200" width="300" height="50" as="geometry" />
    </mxCell>
    
    <!-- GAP WORKFLOW -->
    <mxCell id="gap_bg" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="100" y="320" width="650" height="1400" as="geometry" />
    </mxCell>
    <mxCell id="gap_lbl" value="&lt;b&gt;👨‍💻 GAP - Report A&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=#dae8fc;align=center;fontSize=16;fontColor=#0066cc;fontStyle=1;rounded=1;" vertex="1" parent="1">
      <mxGeometry x="120" y="330" width="200" height="40" as="geometry" />
    </mxCell>

    <!-- GAP Steps -->
    <mxCell id="gap1" value="&lt;b&gt;1. Pull Staging&lt;/b&gt;&lt;br&gt;ดึงโค้ดล่าสุด" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="300" y="400" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="gap2" value="&lt;b&gt;2. Branch&lt;/b&gt;&lt;br&gt;feature/gap-report-a" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="300" y="500" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="gap3" value="&lt;b&gt;3. Code Report A&lt;/b&gt;&lt;br&gt;(ใช้ Vibe Code)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="300" y="600" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="gap4" value="&lt;b&gt;4. Commit&lt;/b&gt;&lt;br&gt;บันทึกงาน" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="300" y="700" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="gap5" value="&lt;b&gt;5. Push&lt;/b&gt;&lt;br&gt;(Sync + Merge + Push)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="300" y="800" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="gap6" value="&lt;b&gt;6. Pull Request&lt;/b&gt;&lt;br&gt;ส่งให้ตรวจ" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="300" y="900" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="gap7" value="&lt;b&gt;7. Merge&lt;/b&gt;&lt;br&gt;รวมเข้า Staging" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="300" y="1000" width="180" height="60" as="geometry" />
    </mxCell>
    
    <mxCell id="gap_note" value="&lt;b&gt;📝 GAP ทำ Report A&lt;/b&gt;&lt;br&gt;- แก้ไฟล์: report-a.js&lt;br&gt;- ไม่กระทบ Report B, C&lt;br&gt;- ทำงานอิสระ" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#fff2cc;strokeColor=#d6b656;align=left;spacingLeft=10;size=15;fontSize=11;" vertex="1" parent="1">
      <mxGeometry x="520" y="550" width="200" height="100" as="geometry" />
    </mxCell>
    
    <!-- POR WORKFLOW -->
    <mxCell id="por_bg" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="825" y="320" width="650" height="1400" as="geometry" />
    </mxCell>
    <mxCell id="por_lbl" value="&lt;b&gt;👨‍💻 Por - Report B&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=#ffe6cc;align=center;fontSize=16;fontColor=#cc6600;fontStyle=1;rounded=1;" vertex="1" parent="1">
      <mxGeometry x="845" y="330" width="200" height="40" as="geometry" />
    </mxCell>
    
    <!-- POR Steps -->
    <mxCell id="por1" value="&lt;b&gt;1. Pull Staging&lt;/b&gt;&lt;br&gt;ดึงโค้ดล่าสุด" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1025" y="400" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="por2" value="&lt;b&gt;2. Branch&lt;/b&gt;&lt;br&gt;feature/por-report-b" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1025" y="500" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="por3" value="&lt;b&gt;3. Code Report B&lt;/b&gt;&lt;br&gt;(ใช้ Vibe Code)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1025" y="600" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="por4" value="&lt;b&gt;4. Commit&lt;/b&gt;&lt;br&gt;บันทึกงาน" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1025" y="700" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="por5" value="&lt;b&gt;5. Push&lt;/b&gt;&lt;br&gt;(Sync + Merge + Push)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="1025" y="800" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="por6" value="&lt;b&gt;6. Pull Request&lt;/b&gt;&lt;br&gt;ส่งให้ตรวจ" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1025" y="900" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="por7" value="&lt;b&gt;7. Merge&lt;/b&gt;&lt;br&gt;รวมเข้า Staging" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="1025" y="1000" width="180" height="60" as="geometry" />
    </mxCell>
    
    <mxCell id="por_note" value="&lt;b&gt;📝 Por ทำ Report B&lt;/b&gt;&lt;br&gt;- แก้ไฟล์: report-b.js&lt;br&gt;- ไม่กระทบ Report A, C&lt;br&gt;- ทำงานอิสระ" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#fff2cc;strokeColor=#d6b656;align=left;spacingLeft=10;size=15;fontSize=11;" vertex="1" parent="1">
      <mxGeometry x="1245" y="550" width="200" height="100" as="geometry" />
    </mxCell>
    
    <!-- CHERRY WORKFLOW -->
    <mxCell id="cherry_bg" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="1550" y="320" width="650" height="1400" as="geometry" />
    </mxCell>
    <mxCell id="cherry_lbl" value="&lt;b&gt;👩‍💻 Cherry - Report C&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=#f8cecc;align=center;fontSize=16;fontColor=#cc0000;fontStyle=1;rounded=1;" vertex="1" parent="1">
      <mxGeometry x="1570" y="330" width="200" height="40" as="geometry" />
    </mxCell>
    
    <!-- CHERRY Steps -->
    <mxCell id="cherry1" value="&lt;b&gt;1. Pull Staging&lt;/b&gt;&lt;br&gt;ดึงโค้ดล่าสุด" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1750" y="400" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="cherry2" value="&lt;b&gt;2. Branch&lt;/b&gt;&lt;br&gt;feature/cherry-report-c" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1750" y="500" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="cherry3" value="&lt;b&gt;3. Code Report C&lt;/b&gt;&lt;br&gt;(ใช้ Vibe Code)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1750" y="600" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="cherry4" value="&lt;b&gt;4. Commit&lt;/b&gt;&lt;br&gt;บันทึกงาน" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1750" y="700" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="cherry5" value="&lt;b&gt;5. Push&lt;/b&gt;&lt;br&gt;(Sync + Merge + Push)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="1750" y="800" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="cherry6" value="&lt;b&gt;6. Pull Request&lt;/b&gt;&lt;br&gt;ส่งให้ตรวจ" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1750" y="900" width="180" height="60" as="geometry" />
    </mxCell>
    <mxCell id="cherry7" value="&lt;b&gt;7. Merge&lt;/b&gt;&lt;br&gt;รวมเข้า Staging" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="1750" y="1000" width="180" height="60" as="geometry" />
    </mxCell>
    
    <mxCell id="cherry_note" value="&lt;b&gt;📝 Cherry ทำ Report C&lt;/b&gt;&lt;br&gt;- แก้ไฟล์: report-c.js&lt;br&gt;- ไม่กระทบ Report A, B&lt;br&gt;- ทำงานอิสระ" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#fff2cc;strokeColor=#d6b656;align=left;spacingLeft=10;size=15;fontSize=11;" vertex="1" parent="1">
      <mxGeometry x="1970" y="550" width="200" height="100" as="geometry" />
    </mxCell>

    <!-- MERGE POINTS (จุดรวมงาน) -->
    <mxCell id="merge_bg" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="100" y="1800" width="2200" height="300" as="geometry" />
    </mxCell>
    <mxCell id="merge_lbl" value="&lt;b&gt;🔄 จุดรวมงาน (Merge Points)&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;fontSize=16;fontColor=#2d7600;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="120" y="1810" width="300" height="30" as="geometry" />
    </mxCell>
    
    <mxCell id="merge_timeline" value="&lt;b&gt;Timeline ตัวอย่าง:&lt;/b&gt;&lt;br&gt;&lt;br&gt;09:00 - GAP, Por, Cherry ทั้ง 3 คน Pull Staging พร้อมกัน&lt;br&gt;09:05 - แต่ละคนสร้าง Branch ของตัวเอง&lt;br&gt;09:10 - เริ่มเขียนโค้ดพร้อมกัน (ไม่รบกวนกัน)&lt;br&gt;&lt;br&gt;10:00 - GAP เสร็จก่อน → Commit → Push → PR → Merge ✅&lt;br&gt;10:30 - Por เสร็จ → Commit → Push (ดึงงาน GAP มาด้วย) → PR → Merge ✅&lt;br&gt;11:00 - Cherry เสร็จ → Commit → Push (ดึงงาน GAP + Por มาด้วย) → PR → Merge ✅&lt;br&gt;&lt;br&gt;&lt;b&gt;ผลลัพธ์:&lt;/b&gt; Staging มีงานครบทั้ง 3 Report!" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#d5e8d4;strokeColor=#82b366;align=left;spacingLeft=10;size=15;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="150" y="1860" width="600" height="220" as="geometry" />
    </mxCell>
    
    <mxCell id="conflict_scenario" value="&lt;b&gt;⚠️ กรณีมี Conflict (งานชนกัน):&lt;/b&gt;&lt;br&gt;&lt;br&gt;&lt;b&gt;สถานการณ์:&lt;/b&gt; GAP และ Por แก้ไฟล์เดียวกัน (shared/utils.js)&lt;br&gt;&lt;br&gt;&lt;b&gt;วิธีแก้:&lt;/b&gt;&lt;br&gt;1. คนที่ Push ทีหลัง (Por) จะเจอ Conflict&lt;br&gt;2. Git จะบอกว่าไฟล์ไหนชน&lt;br&gt;3. Por เปิดไฟล์ → เลือกว่าจะเอาโค้ดของใคร&lt;br&gt;4. Commit อีกครั้ง → Push ใหม่&lt;br&gt;&lt;br&gt;&lt;b&gt;💡 Tips:&lt;/b&gt; ใช้ safe-push.sh จะช่วยดึงงานคนอื่นมาก่อนอัตโนมัติ" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#ffe6cc;strokeColor=#d79b00;align=left;spacingLeft=10;size=15;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="800" y="1860" width="500" height="220" as="geometry" />
    </mxCell>
    
    <mxCell id="best_practice" value="&lt;b&gt;✅ Best Practices สำหรับทีม:&lt;/b&gt;&lt;br&gt;&lt;br&gt;1. &lt;b&gt;แบ่งงานชัดเจน&lt;/b&gt; - แต่ละคนรับผิดชอบไฟล์ต่างกัน&lt;br&gt;2. &lt;b&gt;Pull บ่อยๆ&lt;/b&gt; - ก่อนเริ่มงานใหม่ ดึงโค้ดล่าสุดเสมอ&lt;br&gt;3. &lt;b&gt;Commit เล็กๆ&lt;/b&gt; - อย่ารอทำเสร็จหมดค่อย Commit&lt;br&gt;4. &lt;b&gt;แจ้งทีม&lt;/b&gt; - ถ้าจะแก้ Shared Code ต้องบอกก่อน&lt;br&gt;5. &lt;b&gt;ใช้ Branch&lt;/b&gt; - อย่า Push ตรงไป Staging เด็ดขาด&lt;br&gt;6. &lt;b&gt;Review PR&lt;/b&gt; - ตรวจงานกันก่อน Merge&lt;br&gt;7. &lt;b&gt;Test ก่อน Push&lt;/b&gt; - ทดสอบให้แน่ใจว่าโค้ดไม่พัง" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#dae8fc;strokeColor=#6c8ebf;align=left;spacingLeft=10;size=15;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1350" y="1860" width="500" height="220" as="geometry" />
    </mxCell>
    
    <!-- KEY CONCEPTS (แนวคิดสำคัญ) -->
    <mxCell id="concept_bg" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="100" y="2150" width="2200" height="400" as="geometry" />
    </mxCell>
    <mxCell id="concept_lbl" value="&lt;b&gt;💡 แนวคิดสำคัญที่ต้องเข้าใจ&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;fontSize=16;fontColor=#cc6600;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="120" y="2160" width="300" height="30" as="geometry" />
    </mxCell>
    
    <mxCell id="concept1" value="&lt;b&gt;1. Branch = ห้องทำงานส่วนตัว&lt;/b&gt;&lt;br&gt;&lt;br&gt;เหมือนคุณก็อปปี้โปรเจคทั้งหมดมาทำในห้องของคุณ&lt;br&gt;ทำอะไรก็ได้ พังก็ไม่กระทบคนอื่น&lt;br&gt;พอเสร็จแล้วค่อยเอาไปรวมกับของคนอื่น" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="150" y="2220" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept2" value="&lt;b&gt;2. Staging = กองกลาง&lt;/b&gt;&lt;br&gt;&lt;br&gt;เป็นที่รวมงานของทุกคน&lt;br&gt;ทุกคนดึงโค้ดจากที่นี่&lt;br&gt;ทุกคนส่งงานเข้ามาที่นี่" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="650" y="2220" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept3" value="&lt;b&gt;3. Pull Request = ส่งการบ้าน&lt;/b&gt;&lt;br&gt;&lt;br&gt;คุณทำงานเสร็จแล้ว ส่งให้ Lead ตรวจ&lt;br&gt;Lead ดูว่าโค้ดถูกต้องไหม&lt;br&gt;ถ้าผ่าน Lead จะกด Merge ให้" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1150" y="2220" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept4" value="&lt;b&gt;4. Merge = รวมงาน&lt;/b&gt;&lt;br&gt;&lt;br&gt;เอางานของคุณไปรวมกับงานของคนอื่น&lt;br&gt;Git จะผสมโค้ดให้อัตโนมัติ&lt;br&gt;ถ้าชนกัน Git จะบอก แล้วคุณต้องเลือกเอง" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1650" y="2220" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept5" value="&lt;b&gt;5. Conflict = งานชนกัน&lt;/b&gt;&lt;br&gt;&lt;br&gt;เกิดเมื่อ 2 คนแก้บรรทัดเดียวกันในไฟล์เดียวกัน&lt;br&gt;Git ไม่รู้ว่าจะเอาของใคร ต้องให้คุณเลือก&lt;br&gt;แก้ไขแล้ว Commit ใหม่ก็เสร็จ" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="150" y="2360" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept6" value="&lt;b&gt;6. Sync = ซิงค์งาน&lt;/b&gt;&lt;br&gt;&lt;br&gt;ดึงงานล่าสุดจาก Staging มาผสมกับงานของคุณ&lt;br&gt;ทำก่อน Push เสมอ เพื่อไม่ให้งานชนกัน&lt;br&gt;Script safe-push.sh จะทำให้อัตโนมัติ" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="650" y="2360" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept7" value="&lt;b&gt;7. Shared Code = โค้ดที่ทุกคนใช้&lt;/b&gt;&lt;br&gt;&lt;br&gt;ไฟล์ที่ทุก Module ใช้ร่วมกัน (เช่น auth.js, utils.js)&lt;br&gt;ห้ามแก้เอง ต้องแจ้ง Lead ก่อน&lt;br&gt;ถ้าแก้ผิด ทุก Module จะพังหมด!" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1150" y="2360" width="450" height="100" as="geometry" />
    </mxCell>
    
    <mxCell id="concept8" value="&lt;b&gt;8. CODEOWNERS = เจ้าของโค้ด&lt;/b&gt;&lt;br&gt;&lt;br&gt;กำหนดว่าใครรับผิดชอบไฟล์ไหน&lt;br&gt;ถ้าใครแก้ไฟล์คนอื่น ต้องให้เจ้าของอนุมัติ&lt;br&gt;ป้องกันไม่ให้แก้ไฟล์ผิดคน" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;align=left;spacingLeft=10;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="1650" y="2360" width="450" height="100" as="geometry" />
    </mxCell>

    <!-- EDGES (ลูกศร) -->
    <!-- GAP Edges -->
    <mxCell id="gap_e1" edge="1" parent="1" source="staging_code" target="gap1">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1200" y="300" />
          <mxPoint x="390" y="300" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell id="gap_e2" edge="1" parent="1" source="gap1" target="gap2"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="gap_e3" edge="1" parent="1" source="gap2" target="gap3"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="gap_e4" edge="1" parent="1" source="gap3" target="gap4"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="gap_e5" edge="1" parent="1" source="gap4" target="gap5"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="gap_e6" edge="1" parent="1" source="gap5" target="gap6"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="gap_e7" edge="1" parent="1" source="gap6" target="gap7"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="gap_e8" edge="1" parent="1" source="gap7" target="staging_code" style="dashed=1;strokeColor=#82b366;strokeWidth=2;">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="390" y="1100" />
          <mxPoint x="150" y="1100" />
          <mxPoint x="150" y="225" />
        </Array>
      </mxGeometry>
    </mxCell>
    
    <!-- POR Edges -->
    <mxCell id="por_e1" edge="1" parent="1" source="staging_code" target="por1">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1200" y="300" />
          <mxPoint x="1115" y="300" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell id="por_e2" edge="1" parent="1" source="por1" target="por2"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="por_e3" edge="1" parent="1" source="por2" target="por3"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="por_e4" edge="1" parent="1" source="por3" target="por4"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="por_e5" edge="1" parent="1" source="por4" target="por5"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="por_e6" edge="1" parent="1" source="por5" target="por6"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="por_e7" edge="1" parent="1" source="por6" target="por7"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="por_e8" edge="1" parent="1" source="por7" target="staging_code" style="dashed=1;strokeColor=#82b366;strokeWidth=2;">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1115" y="1150" />
          <mxPoint x="1200" y="1150" />
          <mxPoint x="1200" y="250" />
        </Array>
      </mxGeometry>
    </mxCell>
    
    <!-- CHERRY Edges -->
    <mxCell id="cherry_e1" edge="1" parent="1" source="staging_code" target="cherry1">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1200" y="300" />
          <mxPoint x="1840" y="300" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell id="cherry_e2" edge="1" parent="1" source="cherry1" target="cherry2"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="cherry_e3" edge="1" parent="1" source="cherry2" target="cherry3"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="cherry_e4" edge="1" parent="1" source="cherry3" target="cherry4"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="cherry_e5" edge="1" parent="1" source="cherry4" target="cherry5"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="cherry_e6" edge="1" parent="1" source="cherry5" target="cherry6"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="cherry_e7" edge="1" parent="1" source="cherry6" target="cherry7"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="cherry_e8" edge="1" parent="1" source="cherry7" target="staging_code" style="dashed=1;strokeColor=#82b366;strokeWidth=2;">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1840" y="1200" />
          <mxPoint x="2250" y="1200" />
          <mxPoint x="2250" y="225" />
        </Array>
      </mxGeometry>
    </mxCell>
    
    <!-- PARALLEL INDICATOR -->
    <mxCell id="parallel_indicator" value="⚡ ทั้ง 3 คนทำงานพร้อมกัน (Parallel)" style="text;html=1;strokeColor=#d79b00;fillColor=#ffe6cc;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=1;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="900" y="650" width="400" height="40" as="geometry" />
    </mxCell>
    
    <mxCell id="sync_indicator" value="🔄 แต่ละคนต้อง Sync ก่อน Push (ดึงงานคนอื่นมาผสม)" style="text;html=1;strokeColor=#d6b656;fillColor=#fff2cc;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=1;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="800" y="830" width="600" height="40" as="geometry" />
    </mxCell>
    
    <mxCell id="merge_indicator" value="✅ งานทุกคนจะรวมกันที่ Staging" style="text;html=1;strokeColor=#82b366;fillColor=#d5e8d4;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=1;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="900" y="1030" width="400" height="40" as="geometry" />
    </mxCell>

  </root>
</mxGraphModel>
