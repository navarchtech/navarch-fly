import{defineComponent as e,openBlock as t,createElementBlock as n,createElementVNode as o,toDisplayString as r,ref as l}from"vue";import{defineLayout as i}from"@directus/extensions-sdk";var u=e({inheritAttrs:!1,props:{collection:{type:String,required:!0},name:{type:String,required:!0}}});u.render=function(e,l,i,u,s,a){return t(),n("div",null,[o("p",null,"Name: "+r(e.name),1),o("p",null,"Collection: "+r(e.collection),1)])},u.__file="src/layout.vue";var s=i({id:"custom",name:"Custom",icon:"box",component:u,slots:{options:()=>null,sidebar:()=>null,actions:()=>null},setup:()=>({name:l("Custom Layout")})});export{s as default};