@echo off
setlocal
cd /d "%~dp0"
echo == ChoiceMesh document restructure ==
echo.
echo [1/4] mkdir
if not exist "产出\规划文档\AI工程" mkdir "产出\规划文档\AI工程"
if not exist "产出\规划文档\AI工程\历史版本" mkdir "产出\规划文档\AI工程\历史版本"
if not exist "产出\规划文档\AI工程\评测报告" mkdir "产出\规划文档\AI工程\评测报告"
if not exist "产出\规划文档\Spec文档" mkdir "产出\规划文档\Spec文档"
if not exist "产出\规划文档\Spec文档\历史版本" mkdir "产出\规划文档\Spec文档\历史版本"
if not exist "产出\规划文档\产品迭代" mkdir "产出\规划文档\产品迭代"
if not exist "产出\规划文档\技术验证" mkdir "产出\规划文档\技术验证"
if not exist "产出\规划文档\技术验证\历史版本" mkdir "产出\规划文档\技术验证\历史版本"
if not exist "产出\规划文档\测试与评测" mkdir "产出\规划文档\测试与评测"
if not exist "产出\规划文档\用户研究" mkdir "产出\规划文档\用户研究"
if not exist "产出\规划文档\里程碑文档" mkdir "产出\规划文档\里程碑文档"
if not exist "产出\设计文档\用户体验" mkdir "产出\设计文档\用户体验"
if not exist "产出\设计文档\用户体验\历史版本" mkdir "产出\设计文档\用户体验\历史版本"
if not exist "产出\设计文档\视觉设计" mkdir "产出\设计文档\视觉设计"
echo [2/4] git mv
git mv "产出\规划文档\Spec文档\00_ChoiceMesh文档版本索引_V2.md" "产出\规划文档\Spec文档\00_ChoiceMesh_文档版本索引_V2.md"
git mv "产出\规划文档\Spec文档\06_ChoiceMesh项目Brief_V2.md" "产出\规划文档\Spec文档\01_ChoiceMesh_项目Brief_V2.md"
git mv "产出\规划文档\Spec文档\07_ChoiceMesh_MVP产品与流程规格_V2.md" "产出\规划文档\Spec文档\02_ChoiceMesh_MVP产品与流程规格_V2.md"
git mv "产出\规划文档\Spec文档\08_ChoiceMesh产品需求文档_PRD_V2.md" "产出\规划文档\Spec文档\03_ChoiceMesh_产品需求文档_PRD_V2.md"
git mv "产出\规划文档\Spec文档\04_ChoiceMesh成功指标与评测框架_V1.md" "产出\规划文档\Spec文档\04_ChoiceMesh_成功指标与评测框架_V1.md"
git mv "产出\规划文档\Spec文档\01_ChoiceMesh项目Brief_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_项目Brief_V1.md"
git mv "产出\规划文档\Spec文档\02_ChoiceMesh_MVP范围_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_MVP范围_V1.md"
git mv "产出\规划文档\Spec文档\02_ChoiceMesh_MVP需求与流程规格_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_MVP需求与流程规格_V1.md"
git mv "产出\规划文档\Spec文档\03_ChoiceMesh产品需求文档_PRD_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_产品需求文档_PRD_V1.md"
git mv "产出\规划文档\Spec文档\03_ChoiceMesh信息架构与中保真任务流_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_信息架构与中保真任务流_V1.md"
git mv "产出\规划文档\Spec文档\04_ChoiceMesh中保真迭代说明_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_中保真迭代说明_V1.md"
git mv "产出\规划文档\Spec文档\05_ChoiceMesh_AI能力与产品边界_V1.md" "产出\规划文档\AI工程\历史版本\ChoiceMesh_AI能力与产品边界_V1.md"
git mv "产出\规划文档\技术验证\06_ChoiceMesh_AI能力与产品边界_V2.md" "产出\规划文档\AI工程\01_ChoiceMesh_AI能力与产品边界_V2.md"
git mv "产出\规划文档\技术验证\02_ChoiceMesh_AI接入架构_V1.md" "产出\规划文档\AI工程\02_ChoiceMesh_AI接入架构_V1.md"
git mv "产出\规划文档\技术验证\03_ChoiceMesh_AI提示词与输出契约_V1.md" "产出\规划文档\AI工程\03_ChoiceMesh_AI提示词与输出契约_parse-details-v1.md"
git mv "产出\规划文档\技术验证\04_ChoiceMesh_AI评测与安全规范_V1.md" "产出\规划文档\AI工程\04_ChoiceMesh_AI评测与安全规范_V1.md"
git mv "产出\规划文档\技术验证\08_ChoiceMesh_AI上线前准备清单_V1.md" "产出\规划文档\AI工程\05_ChoiceMesh_AI上线前准备清单_V1.md"
git mv "产出\规划文档\技术验证\01_ChoiceMesh技术方案与验证计划_V1.md" "产出\规划文档\技术验证\01_ChoiceMesh_技术方案与验证计划_V1.md"
git mv "产出\规划文档\技术验证\05_ChoiceMesh状态机与后端契约_V2.md" "产出\规划文档\技术验证\02_ChoiceMesh_状态机与后端契约_V2.md"
git mv "产出\规划文档\技术验证\07_ChoiceMesh后端实现状态与缺口_V2.md" "产出\规划文档\技术验证\03_ChoiceMesh_后端实现状态与缺口_V2.md"
git mv "产出\规划文档\技术验证\07_ChoiceMesh_Demo实现与AI接入记录_V1.md" "产出\规划文档\技术验证\04_ChoiceMesh_Demo实现与AI接入记录_V1.md"
git mv "产出\规划文档\技术验证\ChoiceMesh_MVP状态机与后端契约_V1.md" "产出\规划文档\技术验证\历史版本\ChoiceMesh_状态机与后端契约_V1.md"
git mv "产出\设计文档\用户体验\03_ChoiceMesh信息架构与核心流程_V2.md" "产出\设计文档\用户体验\01_ChoiceMesh_信息架构与核心流程_V2.md"
git mv "产出\设计文档\用户体验\02_ChoiceMesh高保真页面与交互规格_V1.md" "产出\设计文档\用户体验\02_ChoiceMesh_高保真页面与交互规格_V1.md"
git mv "产出\设计文档\用户体验\01_ChoiceMesh信息架构与核心流程_V1.md" "产出\设计文档\用户体验\历史版本\ChoiceMesh_信息架构与核心流程_V1.md"
git mv "产出\设计文档\视觉设计\01_ChoiceMesh高保真视觉系统_V1.md" "产出\设计文档\视觉设计\01_ChoiceMesh_高保真视觉系统_V1.md"
git mv "产出\规划文档\产品迭代\00_ChoiceMesh版本规划_V1.md" "产出\规划文档\产品迭代\00_ChoiceMesh_版本规划_V1.md"
git mv "产出\规划文档\里程碑文档\00_ChoiceMesh项目路线图_V1.md" "产出\规划文档\里程碑文档\00_ChoiceMesh_项目路线图_V1.md"
git mv "产出\规划文档\里程碑文档\01_ChoiceMesh作品集证据规划_V1.md" "产出\规划文档\里程碑文档\01_ChoiceMesh_作品集证据规划_V1.md"
git mv "产出\规划文档\测试与评测\01_ChoiceMesh中保真任务型可用性测试方案_V1.md" "产出\规划文档\测试与评测\01_ChoiceMesh_中保真任务型可用性测试方案_V1.md"
git mv "产出\规划文档\测试与评测\02_ChoiceMesh确认性中保真回测方案_V1.md" "产出\规划文档\测试与评测\02_ChoiceMesh_确认性中保真回测方案_V1.md"
git mv "产出\规划文档\测试与评测\03_ChoiceMesh高保真可用性测试方案_V1.md" "产出\规划文档\测试与评测\03_ChoiceMesh_高保真可用性测试方案_V1.md"
git mv "产出\规划文档\用户研究\01_ChoiceMesh用户研究计划_V1.md" "产出\规划文档\用户研究\01_ChoiceMesh_用户研究计划_V1.md"
git mv "产出\规划文档\用户研究\02_ChoiceMesh假设与风险清单_V1.md" "产出\规划文档\用户研究\02_ChoiceMesh_假设与风险清单_V1.md"
git mv "产出\规划文档\用户研究\03_ChoiceMesh阶段B招募与筛选_V1.md" "产出\规划文档\用户研究\03_ChoiceMesh_阶段B招募与筛选_V1.md"
git mv "产出\规划文档\用户研究\04_ChoiceMesh阶段B访谈提纲_V1.md" "产出\规划文档\用户研究\04_ChoiceMesh_阶段B访谈提纲_V1.md"
git mv "产出\规划文档\用户研究\05_ChoiceMesh阶段B研究综合_V1.md" "产出\规划文档\用户研究\05_ChoiceMesh_阶段B研究综合_V1.md"
git mv "产出\规划文档\用户研究\06_ChoiceMesh阶段C基线任务方案_V1.md" "产出\规划文档\用户研究\06_ChoiceMesh_阶段C基线任务方案_V1.md"
git mv "产出\规划文档\用户研究\07_ChoiceMesh阶段C基线任务结果_V1.md" "产出\规划文档\用户研究\07_ChoiceMesh_阶段C基线任务结果_V1.md"
git mv "产出\规划文档\用户研究\08_ChoiceMesh阶段D概念测试反馈综合_V1.md" "产出\规划文档\用户研究\08_ChoiceMesh_阶段D概念测试反馈综合_V1.md"
git mv "产出\规划文档\用户研究\09_ChoiceMesh阶段D修订版回测综合_V1.md" "产出\规划文档\用户研究\09_ChoiceMesh_阶段D修订版回测综合_V1.md"
git mv "产出\规划文档\用户研究\10_ChoiceMesh中保真可用性测试综合_V1.md" "产出\规划文档\用户研究\10_ChoiceMesh_中保真可用性测试综合_V1.md"
git mv "产出\规划文档\用户研究\11_ChoiceMesh第二轮中保真隐私与协作回测综合_V1.md" "产出\规划文档\用户研究\11_ChoiceMesh_第二轮中保真隐私与协作回测综合_V1.md"
git mv "产出\规划文档\用户研究\12_ChoiceMesh确认性中保真回测综合_V1.md" "产出\规划文档\用户研究\12_ChoiceMesh_确认性中保真回测综合_V1.md"
git mv "产出\规划文档\用户研究\13_ChoiceMesh高保真可用性测试综合_V1.md" "产出\规划文档\用户研究\13_ChoiceMesh_高保真可用性测试综合_V1.md"
echo [3/4] update contents
move /Y "_docs_update\README.md" "README.md" >nul
move /Y "_docs_update\_系统\文档命名与版本规则.md" "_系统\文档命名与版本规则.md" >nul
move /Y "_docs_update\_系统\项目文件导航.md" "_系统\项目文件导航.md" >nul
move /Y "_docs_update\产出\交付物\产品原型\06_ChoiceMesh_高保真原型_V3\README.md" "产出\交付物\产品原型\06_ChoiceMesh_高保真原型_V3\README.md" >nul
move /Y "_docs_update\产出\规划文档\AI工程\01_ChoiceMesh_AI能力与产品边界_V2.md" "产出\规划文档\AI工程\01_ChoiceMesh_AI能力与产品边界_V2.md" >nul
move /Y "_docs_update\产出\规划文档\AI工程\02_ChoiceMesh_AI接入架构_V1.md" "产出\规划文档\AI工程\02_ChoiceMesh_AI接入架构_V1.md" >nul
move /Y "_docs_update\产出\规划文档\AI工程\历史版本\ChoiceMesh_AI能力与产品边界_V1.md" "产出\规划文档\AI工程\历史版本\ChoiceMesh_AI能力与产品边界_V1.md" >nul
move /Y "_docs_update\产出\规划文档\AI工程\评测报告\README.md" "产出\规划文档\AI工程\评测报告\README.md" >nul
move /Y "_docs_update\产出\规划文档\Spec文档\00_ChoiceMesh_文档版本索引_V2.md" "产出\规划文档\Spec文档\00_ChoiceMesh_文档版本索引_V2.md" >nul
move /Y "_docs_update\产出\规划文档\Spec文档\01_ChoiceMesh_项目Brief_V2.md" "产出\规划文档\Spec文档\01_ChoiceMesh_项目Brief_V2.md" >nul
move /Y "_docs_update\产出\规划文档\Spec文档\历史版本\ChoiceMesh_MVP范围_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_MVP范围_V1.md" >nul
move /Y "_docs_update\产出\规划文档\Spec文档\历史版本\ChoiceMesh_MVP需求与流程规格_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_MVP需求与流程规格_V1.md" >nul
move /Y "_docs_update\产出\规划文档\Spec文档\历史版本\ChoiceMesh_产品需求文档_PRD_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_产品需求文档_PRD_V1.md" >nul
move /Y "_docs_update\产出\规划文档\Spec文档\历史版本\ChoiceMesh_项目Brief_V1.md" "产出\规划文档\Spec文档\历史版本\ChoiceMesh_项目Brief_V1.md" >nul
move /Y "_docs_update\产出\规划文档\技术验证\03_ChoiceMesh_后端实现状态与缺口_V2.md" "产出\规划文档\技术验证\03_ChoiceMesh_后端实现状态与缺口_V2.md" >nul
move /Y "_docs_update\产出\规划文档\技术验证\历史版本\ChoiceMesh_状态机与后端契约_V1.md" "产出\规划文档\技术验证\历史版本\ChoiceMesh_状态机与后端契约_V1.md" >nul
move /Y "_docs_update\产出\设计文档\用户体验\历史版本\ChoiceMesh_信息架构与核心流程_V1.md" "产出\设计文档\用户体验\历史版本\ChoiceMesh_信息架构与核心流程_V1.md" >nul
rmdir /S /Q "_docs_update"
echo [4/4] remove empty folders
rmdir "产出\阶段D低保真可点击原型" 2>nul
rmdir "产出\MVP中保真任务流原型" 2>nul
echo.
echo Done. Run: git status
pause
