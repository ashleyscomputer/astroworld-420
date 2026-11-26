import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

type ButtonProps = { title:string; onPress:()=>void; kind?:"primary"|"secondary"|"quiet"|"danger"; small?:boolean; disabled?:boolean };
export function Button({title,onPress,kind="primary",small=false,disabled=false}:ButtonProps) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button,small&&styles.buttonSmall,kind==="primary"&&styles.primary,kind==="secondary"&&styles.secondary,kind==="quiet"&&styles.quiet,kind==="danger"&&styles.danger,disabled&&styles.disabled]}>
    <Text style={[styles.buttonText,kind==="primary"&&styles.primaryText,kind==="quiet"&&styles.quietText]}>{title}</Text>
  </Pressable>;
}
type FieldProps = {label:string;value:string;onChange:(value:string)=>void;placeholder?:string;type?:"default"|"email-address"|"numeric"|"decimal-pad"|"phone-pad";secure?:boolean};
export function Field({label,value,onChange,placeholder,type="default",secure=false}:FieldProps) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder??label} placeholderTextColor={colors.muted} keyboardType={type} secureTextEntry={secure} autoCapitalize={type==="email-address"?"none":"sentences"} style={styles.input}/></View>;
}
export function Card({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}) {
  return <View style={[styles.card,style]}>{children}</View>;
}
export function Heading({title,hint}:{title:string;hint?:string}) {
  return <View style={styles.heading}><Text style={styles.headingText}>{title}</Text>{hint?<Text style={styles.muted}>{hint}</Text>:null}</View>;
}
export function Metric({label,value,accent}:{label:string;value:string;accent:string}) {
  return <View style={styles.metric}><View style={[styles.metricAccent,{backgroundColor:accent}]}/><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
const styles=StyleSheet.create({
  button:{minHeight:44,paddingHorizontal:16,paddingVertical:11,borderRadius:13,alignItems:"center",justifyContent:"center",flex:1},
  buttonSmall:{minHeight:36,paddingHorizontal:11,paddingVertical:8,borderRadius:11,flex:0},
  primary:{backgroundColor:colors.accent},secondary:{backgroundColor:colors.elevated,borderWidth:1,borderColor:colors.border},
  quiet:{backgroundColor:"transparent",borderWidth:1,borderColor:colors.border},danger:{backgroundColor:"rgba(248,113,113,0.13)",borderWidth:1,borderColor:"rgba(248,113,113,0.28)"},
  buttonText:{fontFamily:typography.family.semibold,color:colors.text,fontSize:12,fontWeight:"700"},primaryText:{color:colors.background},quietText:{color:colors.muted},disabled:{opacity:0.42},
  field:{gap:7,marginBottom:11},fieldLabel:{fontFamily:typography.family.semibold,color:colors.muted,fontSize:11,fontWeight:"600"},
  input:{minHeight:48,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:colors.border,color:colors.text,backgroundColor:colors.elevated,fontFamily:typography.family.regular,fontSize:14},
  card:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:18,padding:17,gap:12},
  heading:{gap:5,marginTop:9,marginBottom:3},headingText:{fontFamily:typography.family.bold,color:colors.text,fontSize:21,fontWeight:"700",letterSpacing:-0.6},
  muted:{fontFamily:typography.family.regular,color:colors.muted,fontSize:12,lineHeight:18},
  metric:{flexGrow:1,flexBasis:"46%",minHeight:100,padding:15,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:6},
  metricAccent:{width:26,height:3,borderRadius:2,marginBottom:5},
  metricValue:{fontFamily:typography.family.bold,color:colors.text,fontSize:20,fontWeight:"700",fontVariant:["tabular-nums"]},metricLabel:{fontFamily:typography.family.medium,color:colors.muted,fontSize:11},
});
